import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    grievance: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    grievanceNote: { create: vi.fn() },
    grievanceResponse: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("@/lib/auth/guard", () => ({ requirePermission: vi.fn() }));
vi.mock("@/lib/admin/grievance-assignees", () => ({ getEligibleGrievanceAssignees: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { getEligibleGrievanceAssignees } from "@/lib/admin/grievance-assignees";
import {
  addGrievanceNoteAction,
  addGrievanceResponseAction,
  assignGrievanceAction,
  transitionGrievanceAction,
} from "@/app/admin/grievances/actions";

const fakeUser = { id: "user-1", collegeId: "college-1", permissions: new Set() } as never;

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue(fakeUser);
});

describe("transitionGrievanceAction", () => {
  it("requires grievances:manage", async () => {
    vi.mocked(prisma.grievance.findUniqueOrThrow).mockResolvedValue({
      id: "g1",
      status: "NEW",
    } as never);

    await expect(transitionGrievanceAction("g1", "start_review", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/grievances/g1",
    );
    expect(requirePermission).toHaveBeenCalledWith("grievances:manage");
  });

  it("redirects with workflowError on an illegal transition, without touching the database", async () => {
    vi.mocked(prisma.grievance.findUniqueOrThrow).mockResolvedValue({
      id: "g1",
      status: "NEW",
    } as never);

    await expect(transitionGrievanceAction("g1", "resolve", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/grievances/g1?workflowError=",
    );
  });

  it("applies a legal transition with its reason", async () => {
    vi.mocked(prisma.grievance.findUniqueOrThrow).mockResolvedValue({
      id: "g1",
      status: "UNDER_REVIEW",
    } as never);

    await expect(
      transitionGrievanceAction("g1", "resolve", formData({ comment: "Fixed the issue." })),
    ).rejects.toThrow("REDIRECT:/admin/grievances/g1");

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "GRIEVANCE_STATUS_CHANGE", comment: "Fixed the issue." }),
      }),
    );
  });
});

describe("assignGrievanceAction", () => {
  it("requires grievances:manage", async () => {
    vi.mocked(prisma.grievance.findUniqueOrThrow).mockResolvedValue({
      id: "g1",
      status: "NEW",
      collegeId: "college-1",
    } as never);
    vi.mocked(getEligibleGrievanceAssignees).mockResolvedValue([
      { id: "staff-1", name: "Staff One", email: "staff1@example.invalid" },
    ]);

    await expect(assignGrievanceAction("g1", formData({ assigneeId: "staff-1" }))).rejects.toThrow(
      "REDIRECT:/admin/grievances/g1",
    );
    expect(requirePermission).toHaveBeenCalledWith("grievances:manage");
  });

  it("rejects an assignee not in the eligible list", async () => {
    vi.mocked(prisma.grievance.findUniqueOrThrow).mockResolvedValue({
      id: "g1",
      status: "NEW",
      collegeId: "college-1",
    } as never);
    vi.mocked(getEligibleGrievanceAssignees).mockResolvedValue([]);

    await expect(assignGrievanceAction("g1", formData({ assigneeId: "not-eligible" }))).rejects.toThrow(
      /workflowError=/,
    );
  });

  it("rejects a missing assigneeId", async () => {
    vi.mocked(prisma.grievance.findUniqueOrThrow).mockResolvedValue({
      id: "g1",
      status: "NEW",
      collegeId: "college-1",
    } as never);

    await expect(assignGrievanceAction("g1", new FormData())).rejects.toThrow(/workflowError=/);
    expect(getEligibleGrievanceAssignees).not.toHaveBeenCalled();
  });
});

describe("addGrievanceNoteAction", () => {
  it("requires grievances:manage and writes a note plus audit entry", async () => {
    vi.mocked(prisma.grievanceNote.create).mockResolvedValue({
      id: "note-1",
      note: "Called the submitter, no answer.",
    } as never);

    await expect(
      addGrievanceNoteAction("g1", formData({ note: "Called the submitter, no answer." })),
    ).rejects.toThrow("REDIRECT:/admin/grievances/g1");

    expect(requirePermission).toHaveBeenCalledWith("grievances:manage");
    expect(prisma.grievanceNote.create).toHaveBeenCalledWith({
      data: { grievanceId: "g1", authorId: "user-1", note: "Called the submitter, no answer." },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "GRIEVANCE_NOTE_ADDED" }) }),
    );
  });

  it("rejects an empty note without writing anything", async () => {
    await expect(addGrievanceNoteAction("g1", formData({ note: "" }))).rejects.toThrow(/noteError=/);
    expect(prisma.grievanceNote.create).not.toHaveBeenCalled();
  });
});

describe("addGrievanceResponseAction", () => {
  it("requires grievances:manage and writes a response plus audit entry", async () => {
    vi.mocked(prisma.grievanceResponse.create).mockResolvedValue({
      id: "response-1",
      message: "We have escalated this to the department.",
    } as never);

    await expect(
      addGrievanceResponseAction("g1", formData({ message: "We have escalated this to the department." })),
    ).rejects.toThrow("REDIRECT:/admin/grievances/g1");

    expect(requirePermission).toHaveBeenCalledWith("grievances:manage");
    expect(prisma.grievanceResponse.create).toHaveBeenCalledWith({
      data: {
        grievanceId: "g1",
        respondedById: "user-1",
        message: "We have escalated this to the department.",
      },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "GRIEVANCE_RESPONSE_SENT" }) }),
    );
  });

  it("rejects an empty response without writing anything", async () => {
    await expect(addGrievanceResponseAction("g1", formData({ message: "" }))).rejects.toThrow(
      /responseError=/,
    );
    expect(prisma.grievanceResponse.create).not.toHaveBeenCalled();
  });
});
