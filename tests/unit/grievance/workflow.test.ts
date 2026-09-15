import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    grievance: { update: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  GRIEVANCE_ACTIONS,
  GRIEVANCE_REASON_REQUIRED_ACTIONS,
  GRIEVANCE_TRANSITIONS,
  GrievanceWorkflowError,
  applyGrievanceTransition,
  assignGrievance,
  canAssignFrom,
  getAvailableGrievanceActions,
  isTerminalStatus,
} from "@/lib/grievance-workflow";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GRIEVANCE_TRANSITIONS", () => {
  it("defines every declared action", () => {
    for (const action of GRIEVANCE_ACTIONS) {
      expect(GRIEVANCE_TRANSITIONS[action]).toBeDefined();
    }
  });

  it("implements the full lifecycle: new/assigned -> under_review -> action_required -> under_review -> resolved -> closed", () => {
    expect(GRIEVANCE_TRANSITIONS.start_review).toMatchObject({ from: ["NEW", "ASSIGNED"], to: "UNDER_REVIEW" });
    expect(GRIEVANCE_TRANSITIONS.request_action).toMatchObject({ from: ["UNDER_REVIEW"], to: "ACTION_REQUIRED" });
    expect(GRIEVANCE_TRANSITIONS.resume_review).toMatchObject({ from: ["ACTION_REQUIRED"], to: "UNDER_REVIEW" });
    expect(GRIEVANCE_TRANSITIONS.resolve).toMatchObject({
      from: ["UNDER_REVIEW", "ACTION_REQUIRED"],
      to: "RESOLVED",
    });
    expect(GRIEVANCE_TRANSITIONS.close.to).toBe("CLOSED");
    expect(GRIEVANCE_TRANSITIONS.reopen).toMatchObject({ from: ["RESOLVED", "CLOSED"], to: "UNDER_REVIEW" });
  });

  it("allows close from every non-terminal status", () => {
    expect(GRIEVANCE_TRANSITIONS.close.from).toEqual(
      expect.arrayContaining(["NEW", "ASSIGNED", "UNDER_REVIEW", "ACTION_REQUIRED", "RESOLVED"]),
    );
  });

  it("requires a reason for request_action, resolve, and reopen only", () => {
    expect(GRIEVANCE_REASON_REQUIRED_ACTIONS.has("request_action")).toBe(true);
    expect(GRIEVANCE_REASON_REQUIRED_ACTIONS.has("resolve")).toBe(true);
    expect(GRIEVANCE_REASON_REQUIRED_ACTIONS.has("reopen")).toBe(true);
    expect(GRIEVANCE_REASON_REQUIRED_ACTIONS.has("start_review")).toBe(false);
    expect(GRIEVANCE_REASON_REQUIRED_ACTIONS.has("close")).toBe(false);
  });
});

describe("getAvailableGrievanceActions", () => {
  it("returns only legal actions for a given status", () => {
    expect(getAvailableGrievanceActions("NEW")).toEqual(expect.arrayContaining(["start_review", "close"]));
    expect(getAvailableGrievanceActions("CLOSED")).toEqual(["reopen"]);
  });
});

describe("canAssignFrom / isTerminalStatus", () => {
  it("allows assignment from every pre-resolution status, not RESOLVED/CLOSED", () => {
    expect(canAssignFrom("NEW")).toBe(true);
    expect(canAssignFrom("ASSIGNED")).toBe(true);
    expect(canAssignFrom("UNDER_REVIEW")).toBe(true);
    expect(canAssignFrom("ACTION_REQUIRED")).toBe(true);
    expect(canAssignFrom("RESOLVED")).toBe(false);
    expect(canAssignFrom("CLOSED")).toBe(false);
  });

  it("treats only CLOSED as terminal", () => {
    expect(isTerminalStatus("CLOSED")).toBe(true);
    expect(isTerminalStatus("RESOLVED")).toBe(false);
  });
});

describe("applyGrievanceTransition", () => {
  it("rejects a transition not legal from the current status", async () => {
    await expect(
      applyGrievanceTransition({
        grievanceId: "g1",
        currentStatus: "NEW",
        action: "resolve",
        actorId: "user-1",
      }),
    ).rejects.toThrow(GrievanceWorkflowError);
    expect(prisma.grievance.update).not.toHaveBeenCalled();
  });

  it("rejects request_action/resolve/reopen without a comment", async () => {
    await expect(
      applyGrievanceTransition({
        grievanceId: "g1",
        currentStatus: "UNDER_REVIEW",
        action: "resolve",
        actorId: "user-1",
      }),
    ).rejects.toThrow(/requires a reason/);
    expect(prisma.grievance.update).not.toHaveBeenCalled();
  });

  it("applies a legal transition, sets resolvedAt on resolve, and writes an audit entry", async () => {
    vi.mocked(prisma.grievance.update).mockResolvedValue({} as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    await applyGrievanceTransition({
      grievanceId: "g1",
      currentStatus: "UNDER_REVIEW",
      action: "resolve",
      actorId: "user-1",
      comment: "Resolved after speaking with the department.",
    });

    expect(prisma.grievance.update).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: expect.objectContaining({ status: "RESOLVED", updatedBy: "user-1", resolvedAt: expect.any(Date) }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "user-1",
        action: "GRIEVANCE_STATUS_CHANGE",
        entityType: "Grievance",
        entityId: "g1",
        comment: "Resolved after speaking with the department.",
      }),
    });
  });

  it("clears resolvedAt/closedAt on reopen", async () => {
    vi.mocked(prisma.grievance.update).mockResolvedValue({} as never);

    await applyGrievanceTransition({
      grievanceId: "g1",
      currentStatus: "CLOSED",
      action: "reopen",
      actorId: "user-1",
      comment: "Submitter disputes the resolution.",
    });

    expect(prisma.grievance.update).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: expect.objectContaining({ status: "UNDER_REVIEW", resolvedAt: null, closedAt: null }),
    });
  });
});

describe("assignGrievance", () => {
  it("rejects assignment from RESOLVED/CLOSED", async () => {
    await expect(
      assignGrievance({ grievanceId: "g1", currentStatus: "RESOLVED", assigneeId: "u2", actorId: "u1" }),
    ).rejects.toThrow(GrievanceWorkflowError);
    expect(prisma.grievance.update).not.toHaveBeenCalled();
  });

  it("moves NEW to ASSIGNED and writes an audit entry", async () => {
    vi.mocked(prisma.grievance.update).mockResolvedValue({} as never);

    await assignGrievance({ grievanceId: "g1", currentStatus: "NEW", assigneeId: "u2", actorId: "u1" });

    expect(prisma.grievance.update).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { assignedToId: "u2", status: "ASSIGNED", updatedBy: "u1" },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "GRIEVANCE_ASSIGN", entityId: "g1" }),
    });
  });

  it("keeps the current status when reassigning an already-assigned case", async () => {
    vi.mocked(prisma.grievance.update).mockResolvedValue({} as never);

    await assignGrievance({
      grievanceId: "g1",
      currentStatus: "UNDER_REVIEW",
      assigneeId: "u3",
      actorId: "u1",
    });

    expect(prisma.grievance.update).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { assignedToId: "u3", status: "UNDER_REVIEW", updatedBy: "u1" },
    });
  });
});
