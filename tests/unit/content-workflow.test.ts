import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import {
  WORKFLOW_ACTIONS,
  WORKFLOW_TRANSITIONS,
  WorkflowError,
  applyWorkflowTransition,
  getAvailableActions,
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

  it("only allows submit_for_review from DRAFT, ending at PENDING_REVIEW", () => {
    expect(WORKFLOW_TRANSITIONS.submit_for_review).toMatchObject({
      from: ["DRAFT"],
      to: "PENDING_REVIEW",
    });
  });

  it("only allows approve/reject from PENDING_REVIEW", () => {
    expect(WORKFLOW_TRANSITIONS.approve.from).toEqual(["PENDING_REVIEW"]);
    expect(WORKFLOW_TRANSITIONS.approve.to).toBe("APPROVED");
    expect(WORKFLOW_TRANSITIONS.reject.from).toEqual(["PENDING_REVIEW"]);
    expect(WORKFLOW_TRANSITIONS.reject.to).toBe("DRAFT");
  });

  it("only allows publish from APPROVED", () => {
    expect(WORKFLOW_TRANSITIONS.publish).toMatchObject({ from: ["APPROVED"], to: "PUBLISHED" });
  });

  it("allows archive from any non-archived, non-published-only state", () => {
    expect(WORKFLOW_TRANSITIONS.archive.from.sort()).toEqual(
      ["DRAFT", "PENDING_REVIEW", "APPROVED", "PUBLISHED"].sort(),
    );
    expect(WORKFLOW_TRANSITIONS.archive.to).toBe("ARCHIVED");
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

  it("applies a legal transition, calls update, and writes an audit log entry", async () => {
    const update = vi.fn().mockResolvedValue(undefined);

    await applyWorkflowTransition({
      entityType: "Department",
      entityId: "dept-1",
      currentStatus: "DRAFT",
      action: "submit_for_review",
      actorId: "user-1",
      update,
    });

    expect(update).toHaveBeenCalledWith({ status: "PENDING_REVIEW", updatedBy: "user-1" });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "user-1",
        action: "UPDATE",
        entityType: "Department",
        entityId: "dept-1",
        beforeSnapshot: { status: "DRAFT" },
        afterSnapshot: { status: "PENDING_REVIEW" },
      }),
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

  it("uses the APPROVE audit action for approve and REJECT for reject", async () => {
    const update = vi.fn().mockResolvedValue(undefined);

    await applyWorkflowTransition({
      entityType: "Faculty",
      entityId: "fac-1",
      currentStatus: "PENDING_REVIEW",
      action: "approve",
      actorId: "reviewer-1",
      update,
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "APPROVE" }) }),
    );

    await applyWorkflowTransition({
      entityType: "Faculty",
      entityId: "fac-2",
      currentStatus: "PENDING_REVIEW",
      action: "reject",
      actorId: "reviewer-1",
      update,
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "REJECT" }) }),
    );
  });
});

describe("getAvailableActions", () => {
  it("offers submit_for_review from DRAFT only when the caller can manage", () => {
    expect(getAvailableActions("DRAFT", { canManage: true, canPublish: false })).toEqual([
      "submit_for_review",
    ]);
    // archive is also legal from DRAFT, but requires canPublish, not canManage — see the
    // "no self-approval" test below for why manage-only never includes it.
    expect(getAvailableActions("DRAFT", { canManage: false, canPublish: true })).toEqual([
      "archive",
    ]);
  });

  it("offers approve/reject from PENDING_REVIEW only when the caller can publish", () => {
    const withPublish = getAvailableActions("PENDING_REVIEW", { canManage: true, canPublish: true });
    expect(withPublish.sort()).toEqual(["approve", "archive", "reject"].sort());

    expect(getAvailableActions("PENDING_REVIEW", { canManage: true, canPublish: false })).toEqual([]);
  });

  it("offers nothing from ARCHIVED (a dead end)", () => {
    expect(getAvailableActions("ARCHIVED", { canManage: true, canPublish: true })).toEqual([]);
  });

  it("a manage-only caller can never publish or archive — structurally no self-approval", () => {
    for (const status of ["DRAFT", "PENDING_REVIEW", "APPROVED", "PUBLISHED"] as const) {
      const actions = getAvailableActions(status, { canManage: true, canPublish: false });
      expect(actions).not.toContain("publish");
      expect(actions).not.toContain("approve");
      expect(actions).not.toContain("archive");
    }
  });
});
