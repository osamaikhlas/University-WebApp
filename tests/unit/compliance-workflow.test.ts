import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    complianceRequirement: { update: vi.fn() },
    complianceVerification: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  COMPLIANCE_ACTIONS,
  COMPLIANCE_TRANSITIONS,
  REASON_REQUIRED_ACTIONS,
  VIEW_PERMISSION_ACTIONS,
  ComplianceWorkflowError,
  applyComplianceTransition,
  getAvailableComplianceActions,
  syncAutomaticStatus,
  type ComplianceStatusValue,
} from "@/lib/compliance-workflow";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("COMPLIANCE_TRANSITIONS", () => {
  it("defines every declared compliance action", () => {
    for (const action of COMPLIANCE_ACTIONS) {
      expect(COMPLIANCE_TRANSITIONS[action]).toBeDefined();
    }
  });

  it("implements the required chain NOT_STARTED/IN_PROGRESS -> READY_FOR_REVIEW -> VERIFIED", () => {
    expect(COMPLIANCE_TRANSITIONS.submit_for_review).toMatchObject({
      from: ["IN_PROGRESS", "NEEDS_UPDATE"],
      to: "READY_FOR_REVIEW",
      auditAction: "COMPLIANCE_SUBMIT_FOR_REVIEW",
    });
    expect(COMPLIANCE_TRANSITIONS.verify).toMatchObject({
      from: ["READY_FOR_REVIEW"],
      to: "VERIFIED",
      auditAction: "COMPLIANCE_VERIFY",
      decision: "VERIFIED",
    });
  });

  it("allows request_update (reject/review) from READY_FOR_REVIEW and from VERIFIED, always to NEEDS_UPDATE", () => {
    expect(COMPLIANCE_TRANSITIONS.request_update).toMatchObject({
      from: ["READY_FOR_REVIEW", "VERIFIED"],
      to: "NEEDS_UPDATE",
      auditAction: "COMPLIANCE_REQUEST_UPDATE",
      decision: "NEEDS_UPDATE",
    });
  });

  it("allows marking NOT_STARTED/IN_PROGRESS as NOT_APPLICABLE, reversible via reopen", () => {
    expect(COMPLIANCE_TRANSITIONS.mark_not_applicable).toMatchObject({
      from: ["NOT_STARTED", "IN_PROGRESS"],
      to: "NOT_APPLICABLE",
      auditAction: "COMPLIANCE_MARK_NOT_APPLICABLE",
    });
    expect(COMPLIANCE_TRANSITIONS.reopen).toMatchObject({
      from: ["NOT_APPLICABLE"],
      to: "NOT_STARTED",
      auditAction: "COMPLIANCE_REOPEN",
    });
  });

  it("requires a reason only for request_update and mark_not_applicable", () => {
    expect(REASON_REQUIRED_ACTIONS.has("request_update")).toBe(true);
    expect(REASON_REQUIRED_ACTIONS.has("mark_not_applicable")).toBe(true);
    for (const action of ["submit_for_review", "verify", "reopen"] as const) {
      expect(REASON_REQUIRED_ACTIONS.has(action)).toBe(false);
    }
  });

  it("classifies only submit_for_review as a view-permission (owner-level) action", () => {
    expect(VIEW_PERMISSION_ACTIONS.has("submit_for_review")).toBe(true);
    for (const action of ["verify", "request_update", "mark_not_applicable", "reopen"] as const) {
      expect(VIEW_PERMISSION_ACTIONS.has(action)).toBe(false);
    }
  });
});

describe("applyComplianceTransition", () => {
  it("rejects a transition that isn't legal from the current status", async () => {
    await expect(
      applyComplianceTransition({
        requirementId: "req-1",
        currentStatus: "NOT_STARTED",
        action: "verify",
        actorId: "user-1",
      }),
    ).rejects.toThrow(ComplianceWorkflowError);

    expect(prisma.complianceRequirement.update).not.toHaveBeenCalled();
    expect(prisma.complianceVerification.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  const CHAIN: {
    action: (typeof COMPLIANCE_ACTIONS)[number];
    from: ComplianceStatusValue;
    to: ComplianceStatusValue;
    comment?: string;
  }[] = [
    { action: "submit_for_review", from: "IN_PROGRESS", to: "READY_FOR_REVIEW" },
    { action: "verify", from: "READY_FOR_REVIEW", to: "VERIFIED" },
    {
      action: "request_update",
      from: "READY_FOR_REVIEW",
      to: "NEEDS_UPDATE",
      comment: "Missing accreditation details.",
    },
    { action: "submit_for_review", from: "NEEDS_UPDATE", to: "READY_FOR_REVIEW" },
    {
      action: "request_update",
      from: "VERIFIED",
      to: "NEEDS_UPDATE",
      comment: "Content went stale.",
    },
    {
      action: "mark_not_applicable",
      from: "NOT_STARTED",
      to: "NOT_APPLICABLE",
      comment: "Not offered by this college.",
    },
    { action: "reopen", from: "NOT_APPLICABLE", to: "NOT_STARTED" },
  ];

  it.each(CHAIN)(
    "applies $action ($from -> $to), updates status, and writes an audit log entry",
    async ({ action, from, to, comment }) => {
      await applyComplianceTransition({
        requirementId: "req-1",
        currentStatus: from,
        action,
        actorId: "user-1",
        comment,
      });

      expect(prisma.complianceRequirement.update).toHaveBeenCalledWith({
        where: { id: "req-1" },
        data: { status: to },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: "user-1",
          action: COMPLIANCE_TRANSITIONS[action].auditAction,
          entityType: "ComplianceRequirement",
          entityId: "req-1",
          beforeSnapshot: { status: from },
          afterSnapshot: { status: to },
        }),
      });
    },
  );

  it("writes a ComplianceVerification row only for verify/request_update, never for other actions", async () => {
    await applyComplianceTransition({
      requirementId: "req-1",
      currentStatus: "READY_FOR_REVIEW",
      action: "verify",
      actorId: "reviewer-1",
      comment: "Looks good.",
    });
    expect(prisma.complianceVerification.create).toHaveBeenCalledWith({
      data: {
        requirementId: "req-1",
        decision: "VERIFIED",
        verifiedById: "reviewer-1",
        note: "Looks good.",
      },
    });

    vi.clearAllMocks();

    await applyComplianceTransition({
      requirementId: "req-1",
      currentStatus: "IN_PROGRESS",
      action: "submit_for_review",
      actorId: "user-1",
    });
    expect(prisma.complianceVerification.create).not.toHaveBeenCalled();
  });

  it("a requirement can never reach VERIFIED except through the verify action", () => {
    for (const action of COMPLIANCE_ACTIONS) {
      if (action === "verify") continue;
      expect(COMPLIANCE_TRANSITIONS[action].to).not.toBe("VERIFIED");
    }
  });

  it("request_update requires a non-empty reason and is refused without one", async () => {
    await expect(
      applyComplianceTransition({
        requirementId: "req-1",
        currentStatus: "READY_FOR_REVIEW",
        action: "request_update",
        actorId: "reviewer-1",
      }),
    ).rejects.toThrow(ComplianceWorkflowError);
    expect(prisma.complianceRequirement.update).not.toHaveBeenCalled();
    expect(prisma.complianceVerification.create).not.toHaveBeenCalled();

    await expect(
      applyComplianceTransition({
        requirementId: "req-1",
        currentStatus: "READY_FOR_REVIEW",
        action: "request_update",
        actorId: "reviewer-1",
        comment: "   ",
      }),
    ).rejects.toThrow(ComplianceWorkflowError);
    expect(prisma.complianceRequirement.update).not.toHaveBeenCalled();
  });

  it("mark_not_applicable requires a non-empty reason and is refused without one", async () => {
    await expect(
      applyComplianceTransition({
        requirementId: "req-1",
        currentStatus: "NOT_STARTED",
        action: "mark_not_applicable",
        actorId: "reviewer-1",
      }),
    ).rejects.toThrow(ComplianceWorkflowError);
    expect(prisma.complianceRequirement.update).not.toHaveBeenCalled();
  });

  it("verify does not require a comment", async () => {
    await applyComplianceTransition({
      requirementId: "req-1",
      currentStatus: "READY_FOR_REVIEW",
      action: "verify",
      actorId: "reviewer-1",
    });
    expect(prisma.complianceRequirement.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { status: "VERIFIED" },
    });
    expect(prisma.complianceVerification.create).toHaveBeenCalledWith({
      data: { requirementId: "req-1", decision: "VERIFIED", verifiedById: "reviewer-1", note: undefined },
    });
  });
});

describe("getAvailableComplianceActions", () => {
  it("offers submit_for_review from IN_PROGRESS/NEEDS_UPDATE only when the caller can view", () => {
    expect(getAvailableComplianceActions("IN_PROGRESS", { canView: true, canVerify: false })).toEqual([
      "submit_for_review",
    ]);
    expect(getAvailableComplianceActions("IN_PROGRESS", { canView: false, canVerify: true })).toEqual([
      "mark_not_applicable",
    ]);
    expect(getAvailableComplianceActions("NEEDS_UPDATE", { canView: true, canVerify: false })).toContain(
      "submit_for_review",
    );
  });

  it("offers verify/request_update from READY_FOR_REVIEW only when the caller can verify", () => {
    const withVerify = getAvailableComplianceActions("READY_FOR_REVIEW", {
      canView: true,
      canVerify: true,
    });
    expect(withVerify.sort()).toEqual(["request_update", "verify"].sort());
    expect(
      getAvailableComplianceActions("READY_FOR_REVIEW", { canView: true, canVerify: false }),
    ).toEqual([]);
  });

  it("offers request_update from VERIFIED only when the caller can verify", () => {
    expect(getAvailableComplianceActions("VERIFIED", { canView: false, canVerify: true })).toEqual([
      "request_update",
    ]);
    expect(getAvailableComplianceActions("VERIFIED", { canView: true, canVerify: false })).toEqual([]);
  });

  it("offers mark_not_applicable from NOT_STARTED/IN_PROGRESS only when the caller can verify", () => {
    expect(
      getAvailableComplianceActions("NOT_STARTED", { canView: true, canVerify: false }),
    ).toEqual([]);
    expect(
      getAvailableComplianceActions("NOT_STARTED", { canView: false, canVerify: true }),
    ).toEqual(["mark_not_applicable"]);
  });

  it("offers reopen from NOT_APPLICABLE only when the caller can verify", () => {
    expect(getAvailableComplianceActions("NOT_APPLICABLE", { canView: true, canVerify: false })).toEqual(
      [],
    );
    expect(getAvailableComplianceActions("NOT_APPLICABLE", { canView: false, canVerify: true })).toEqual([
      "reopen",
    ]);
  });

  it("a view-only caller never sees verify/request_update/mark_not_applicable/reopen", () => {
    for (const status of [
      "NOT_STARTED",
      "IN_PROGRESS",
      "READY_FOR_REVIEW",
      "VERIFIED",
      "NEEDS_UPDATE",
      "NOT_APPLICABLE",
    ] as const) {
      const actions = getAvailableComplianceActions(status, { canView: true, canVerify: false });
      expect(actions).not.toContain("verify");
      expect(actions).not.toContain("request_update");
      expect(actions).not.toContain("mark_not_applicable");
      expect(actions).not.toContain("reopen");
    }
  });
});

describe("syncAutomaticStatus", () => {
  it("moves NOT_STARTED to IN_PROGRESS when there is progress, and logs a system audit entry", async () => {
    const result = await syncAutomaticStatus({
      requirementId: "req-1",
      currentStatus: "NOT_STARTED",
      hasProgress: true,
    });

    expect(result).toBe("IN_PROGRESS");
    expect(prisma.complianceRequirement.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { status: "IN_PROGRESS" },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: null,
        action: "UPDATE",
        beforeSnapshot: { status: "NOT_STARTED" },
        afterSnapshot: { status: "IN_PROGRESS" },
      }),
    });
    expect(prisma.complianceVerification.create).not.toHaveBeenCalled();
  });

  it("moves IN_PROGRESS back to NOT_STARTED when there is no progress", async () => {
    const result = await syncAutomaticStatus({
      requirementId: "req-1",
      currentStatus: "IN_PROGRESS",
      hasProgress: false,
    });
    expect(result).toBe("NOT_STARTED");
  });

  it("is a no-op (and never writes) when the computed status matches the current one", async () => {
    const result = await syncAutomaticStatus({
      requirementId: "req-1",
      currentStatus: "IN_PROGRESS",
      hasProgress: true,
    });
    expect(result).toBe("IN_PROGRESS");
    expect(prisma.complianceRequirement.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it.each(["READY_FOR_REVIEW", "VERIFIED", "NEEDS_UPDATE", "NOT_APPLICABLE"] as const)(
    "never overrides the human-gated status %s, regardless of completeness",
    async (status) => {
      const result = await syncAutomaticStatus({
        requirementId: "req-1",
        currentStatus: status,
        hasProgress: false,
      });
      expect(result).toBe(status);
      expect(prisma.complianceRequirement.update).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    },
  );
});
