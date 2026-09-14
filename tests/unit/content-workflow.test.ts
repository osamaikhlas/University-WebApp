import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import {
  WORKFLOW_ACTIONS,
  WORKFLOW_TRANSITIONS,
  MANAGE_PERMISSION_ACTIONS,
  REASON_REQUIRED_ACTIONS,
  WorkflowError,
  applyWorkflowTransition,
  getAvailableActions,
  isPubliclyVisible,
  type ContentStatusValue,
} from "@/lib/content-workflow";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("WORKFLOW_TRANSITIONS", () => {
  it("defines every declared workflow action", () => {
    for (const action of WORKFLOW_ACTIONS) {
      expect(WORKFLOW_TRANSITIONS[action]).toBeDefined();
    }
  });

  it("implements the required chain DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED -> PUBLISHED", () => {
    expect(WORKFLOW_TRANSITIONS.submit_for_review).toMatchObject({
      from: ["DRAFT"],
      to: "SUBMITTED",
      auditAction: "SUBMIT",
    });
    expect(WORKFLOW_TRANSITIONS.start_review).toMatchObject({
      from: ["SUBMITTED"],
      to: "UNDER_REVIEW",
      auditAction: "START_REVIEW",
    });
    expect(WORKFLOW_TRANSITIONS.approve).toMatchObject({
      from: ["UNDER_REVIEW"],
      to: "APPROVED",
      auditAction: "APPROVE",
    });
    expect(WORKFLOW_TRANSITIONS.publish).toMatchObject({
      from: ["APPROVED"],
      to: "PUBLISHED",
      auditAction: "PUBLISH",
    });
  });

  it("implements the required chain PUBLISHED -> UPDATE_REQUIRED -> DRAFT", () => {
    expect(WORKFLOW_TRANSITIONS.request_update).toMatchObject({
      from: ["PUBLISHED"],
      to: "UPDATE_REQUIRED",
      auditAction: "REQUEST_UPDATE",
    });
    expect(WORKFLOW_TRANSITIONS.return_to_draft).toMatchObject({
      from: ["UPDATE_REQUIRED"],
      to: "DRAFT",
      auditAction: "RETURN_TO_DRAFT",
    });
  });

  it("only allows reject from UNDER_REVIEW, sending content back to DRAFT", () => {
    expect(WORKFLOW_TRANSITIONS.reject).toMatchObject({
      from: ["UNDER_REVIEW"],
      to: "DRAFT",
      auditAction: "REJECT",
    });
  });

  it("marks reject as the only action requiring a reason/comment", () => {
    expect(REASON_REQUIRED_ACTIONS.has("reject")).toBe(true);
    for (const action of WORKFLOW_ACTIONS) {
      if (action === "reject") continue;
      expect(REASON_REQUIRED_ACTIONS.has(action)).toBe(false);
    }
  });

  it("classifies submit_for_review and return_to_draft as manage actions, everything else as publish actions", () => {
    expect(MANAGE_PERMISSION_ACTIONS.has("submit_for_review")).toBe(true);
    expect(MANAGE_PERMISSION_ACTIONS.has("return_to_draft")).toBe(true);
    for (const action of [
      "start_review",
      "approve",
      "reject",
      "publish",
      "request_update",
    ] as const) {
      expect(MANAGE_PERMISSION_ACTIONS.has(action)).toBe(false);
    }
  });
});

describe("applyWorkflowTransition", () => {
  it("rejects a transition that isn't legal from the current status", async () => {
    const update = vi.fn();
    await expect(
      applyWorkflowTransition({
        entityType: "Department",
        entityId: "dept-1",
        currentStatus: "DRAFT",
        action: "publish",
        actorId: "user-1",
        update,
      }),
    ).rejects.toThrow(WorkflowError);

    expect(update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  const CHAIN: {
    action: (typeof WORKFLOW_ACTIONS)[number];
    from: ContentStatusValue;
    to: ContentStatusValue;
  }[] = [
    { action: "submit_for_review", from: "DRAFT", to: "SUBMITTED" },
    { action: "start_review", from: "SUBMITTED", to: "UNDER_REVIEW" },
    { action: "approve", from: "UNDER_REVIEW", to: "APPROVED" },
    { action: "publish", from: "APPROVED", to: "PUBLISHED" },
    { action: "request_update", from: "PUBLISHED", to: "UPDATE_REQUIRED" },
    { action: "return_to_draft", from: "UPDATE_REQUIRED", to: "DRAFT" },
  ];

  it.each(CHAIN)(
    "applies $action ($from -> $to), calls update, and writes an audit log entry with actor + status snapshots",
    async ({ action, from, to }) => {
      const update = vi.fn().mockResolvedValue(undefined);

      await applyWorkflowTransition({
        entityType: "Department",
        entityId: "dept-1",
        currentStatus: from,
        action,
        actorId: "user-1",
        update,
      });

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ status: to, updatedBy: "user-1" }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: "user-1",
          action: WORKFLOW_TRANSITIONS[action].auditAction,
          entityType: "Department",
          entityId: "dept-1",
          beforeSnapshot: { status: from },
          afterSnapshot: { status: to },
        }),
      });
    },
  );

  it("rejecting UNDER_REVIEW content requires a non-empty reason and is refused without one", async () => {
    const update = vi.fn();

    await expect(
      applyWorkflowTransition({
        entityType: "Department",
        entityId: "dept-1",
        currentStatus: "UNDER_REVIEW",
        action: "reject",
        actorId: "reviewer-1",
        update,
      }),
    ).rejects.toThrow(WorkflowError);
    expect(update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();

    await expect(
      applyWorkflowTransition({
        entityType: "Department",
        entityId: "dept-1",
        currentStatus: "UNDER_REVIEW",
        action: "reject",
        actorId: "reviewer-1",
        comment: "   ",
        update,
      }),
    ).rejects.toThrow(WorkflowError);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects UNDER_REVIEW -> DRAFT and stores the rejection reason on the audit log when one is given", async () => {
    const update = vi.fn().mockResolvedValue(undefined);

    await applyWorkflowTransition({
      entityType: "Department",
      entityId: "dept-1",
      currentStatus: "UNDER_REVIEW",
      action: "reject",
      actorId: "reviewer-1",
      comment: "Missing accreditation details.",
      update,
    });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "DRAFT" }));
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "REJECT",
        comment: "Missing accreditation details.",
        beforeSnapshot: { status: "UNDER_REVIEW" },
        afterSnapshot: { status: "DRAFT" },
      }),
    });
  });

  it("stores an optional comment on non-reject transitions too", async () => {
    const update = vi.fn().mockResolvedValue(undefined);

    await applyWorkflowTransition({
      entityType: "Department",
      entityId: "dept-1",
      currentStatus: "PUBLISHED",
      action: "request_update",
      actorId: "reviewer-1",
      comment: "The contact phone number looks outdated.",
      update,
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ comment: "The contact phone number looks outdated." }),
    });
  });

  it("omits the comment field entirely when none is given", async () => {
    const update = vi.fn().mockResolvedValue(undefined);

    await applyWorkflowTransition({
      entityType: "Department",
      entityId: "dept-1",
      currentStatus: "DRAFT",
      action: "submit_for_review",
      actorId: "user-1",
      update,
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ comment: undefined }),
    });
  });

  it("sets publishedAt/publishedBy only when transitioning to PUBLISHED", async () => {
    const update = vi.fn().mockResolvedValue(undefined);

    await applyWorkflowTransition({
      entityType: "Program",
      entityId: "prog-1",
      currentStatus: "APPROVED",
      action: "publish",
      actorId: "reviewer-1",
      update,
    });

    const data = update.mock.calls[0]![0];
    expect(data.status).toBe("PUBLISHED");
    expect(data.publishedAt).toBeInstanceOf(Date);
    expect(data.publishedBy).toBe("reviewer-1");
  });

  it.each(CHAIN.filter((t) => t.action !== "publish"))(
    "does not set publishedAt/publishedBy for $action",
    async ({ action, from }) => {
      const update = vi.fn().mockResolvedValue(undefined);

      await applyWorkflowTransition({
        entityType: "Program",
        entityId: "prog-1",
        currentStatus: from,
        action,
        actorId: "user-1",
        comment: action === "reject" ? "needs work" : undefined,
        update,
      });

      const data = update.mock.calls[0]![0];
      expect(data.publishedAt).toBeUndefined();
      expect(data.publishedBy).toBeUndefined();
    },
  );
});

describe("getAvailableActions", () => {
  it("offers submit_for_review from DRAFT only when the caller can manage", () => {
    expect(getAvailableActions("DRAFT", { canManage: true, canPublish: false })).toEqual([
      "submit_for_review",
    ]);
    expect(getAvailableActions("DRAFT", { canManage: false, canPublish: true })).toEqual([]);
  });

  it("offers start_review from SUBMITTED only when the caller can publish", () => {
    expect(getAvailableActions("SUBMITTED", { canManage: true, canPublish: false })).toEqual([]);
    expect(getAvailableActions("SUBMITTED", { canManage: false, canPublish: true })).toEqual([
      "start_review",
    ]);
  });

  it("offers approve/reject from UNDER_REVIEW only when the caller can publish", () => {
    const withPublish = getAvailableActions("UNDER_REVIEW", { canManage: true, canPublish: true });
    expect(withPublish.sort()).toEqual(["approve", "reject"].sort());

    expect(getAvailableActions("UNDER_REVIEW", { canManage: true, canPublish: false })).toEqual([]);
  });

  it("offers publish from APPROVED only when the caller can publish", () => {
    expect(getAvailableActions("APPROVED", { canManage: true, canPublish: false })).toEqual([]);
    expect(getAvailableActions("APPROVED", { canManage: false, canPublish: true })).toEqual([
      "publish",
    ]);
  });

  it("offers request_update from PUBLISHED only when the caller can publish", () => {
    expect(getAvailableActions("PUBLISHED", { canManage: true, canPublish: false })).toEqual([]);
    expect(getAvailableActions("PUBLISHED", { canManage: false, canPublish: true })).toEqual([
      "request_update",
    ]);
  });

  it("offers return_to_draft from UPDATE_REQUIRED only when the caller can manage", () => {
    expect(getAvailableActions("UPDATE_REQUIRED", { canManage: false, canPublish: true })).toEqual(
      [],
    );
    expect(getAvailableActions("UPDATE_REQUIRED", { canManage: true, canPublish: false })).toEqual([
      "return_to_draft",
    ]);
  });

  it("a manage-only caller can never review, approve, reject, publish, or flag a published record", () => {
    for (const status of [
      "DRAFT",
      "SUBMITTED",
      "UNDER_REVIEW",
      "APPROVED",
      "PUBLISHED",
      "UPDATE_REQUIRED",
    ] as const) {
      const actions = getAvailableActions(status, { canManage: true, canPublish: false });
      expect(actions).not.toContain("start_review");
      expect(actions).not.toContain("approve");
      expect(actions).not.toContain("reject");
      expect(actions).not.toContain("publish");
      expect(actions).not.toContain("request_update");
    }
  });

  it("a publish-only caller can never submit for review or return update-required content to draft", () => {
    for (const status of [
      "DRAFT",
      "SUBMITTED",
      "UNDER_REVIEW",
      "APPROVED",
      "PUBLISHED",
      "UPDATE_REQUIRED",
    ] as const) {
      const actions = getAvailableActions(status, { canManage: false, canPublish: true });
      expect(actions).not.toContain("submit_for_review");
      expect(actions).not.toContain("return_to_draft");
    }
  });
});

describe("isPubliclyVisible", () => {
  it("is true only for PUBLISHED — not even APPROVED content is public", () => {
    expect(isPubliclyVisible("PUBLISHED")).toBe(true);
    for (const status of [
      "DRAFT",
      "SUBMITTED",
      "UNDER_REVIEW",
      "APPROVED",
      "UPDATE_REQUIRED",
    ] as const) {
      expect(isPubliclyVisible(status)).toBe(false);
    }
  });
});
