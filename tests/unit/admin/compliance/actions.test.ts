import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    complianceRequirement: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    complianceVerification: { create: vi.fn() },
    complianceEvidence: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("@/lib/auth/guard", () => ({ requirePermission: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { redirect } from "next/navigation";
import { addEvidence, transitionRequirement } from "@/app/admin/compliance/actions";

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

describe("transitionRequirement", () => {
  it("requires compliance:view for submit_for_review", async () => {
    vi.mocked(prisma.complianceRequirement.findUniqueOrThrow).mockResolvedValue({
      id: "req-1",
      status: "IN_PROGRESS",
    } as never);
    vi.mocked(prisma.complianceRequirement.update).mockResolvedValue({} as never);

    await expect(
      transitionRequirement("req-1", "submit_for_review", new FormData()),
    ).rejects.toThrow("REDIRECT:/admin/compliance/req-1");
    expect(requirePermission).toHaveBeenCalledWith("compliance:view");
    expect(prisma.complianceRequirement.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { status: "READY_FOR_REVIEW" },
    });
  });

  it("requires compliance:verify for verify", async () => {
    vi.mocked(prisma.complianceRequirement.findUniqueOrThrow).mockResolvedValue({
      id: "req-1",
      status: "READY_FOR_REVIEW",
    } as never);
    vi.mocked(prisma.complianceRequirement.update).mockResolvedValue({} as never);

    await expect(transitionRequirement("req-1", "verify", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/compliance/req-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("compliance:verify");
    expect(prisma.complianceRequirement.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { status: "VERIFIED" },
    });
    expect(prisma.complianceVerification.create).toHaveBeenCalledWith({
      data: { requirementId: "req-1", decision: "VERIFIED", verifiedById: "user-1", note: undefined },
    });
  });

  it("requires compliance:verify for request_update, and refuses it without a reason", async () => {
    vi.mocked(prisma.complianceRequirement.findUniqueOrThrow).mockResolvedValue({
      id: "req-1",
      status: "READY_FOR_REVIEW",
    } as never);

    await expect(
      transitionRequirement("req-1", "request_update", new FormData()),
    ).rejects.toThrow("REDIRECT:/admin/compliance/req-1?workflowError=");
    expect(requirePermission).toHaveBeenCalledWith("compliance:verify");
    expect(prisma.complianceRequirement.update).not.toHaveBeenCalled();
  });

  it("request_update succeeds once a reason is given, recording the note on the verification row", async () => {
    vi.mocked(prisma.complianceRequirement.findUniqueOrThrow).mockResolvedValue({
      id: "req-1",
      status: "READY_FOR_REVIEW",
    } as never);
    vi.mocked(prisma.complianceRequirement.update).mockResolvedValue({} as never);

    await expect(
      transitionRequirement(
        "req-1",
        "request_update",
        formData({ comment: "Missing accreditation details." }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/compliance/req-1");

    expect(prisma.complianceRequirement.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { status: "NEEDS_UPDATE" },
    });
    expect(prisma.complianceVerification.create).toHaveBeenCalledWith({
      data: {
        requirementId: "req-1",
        decision: "NEEDS_UPDATE",
        verifiedById: "user-1",
        note: "Missing accreditation details.",
      },
    });
  });

  it("mark_not_applicable requires compliance:verify and a reason", async () => {
    vi.mocked(prisma.complianceRequirement.findUniqueOrThrow).mockResolvedValue({
      id: "req-20",
      status: "NOT_STARTED",
    } as never);

    await expect(
      transitionRequirement("req-20", "mark_not_applicable", new FormData()),
    ).rejects.toThrow("REDIRECT:/admin/compliance/req-20?workflowError=");
    expect(requirePermission).toHaveBeenCalledWith("compliance:verify");
    expect(prisma.complianceRequirement.update).not.toHaveBeenCalled();
  });

  it("reopen requires compliance:verify and moves NOT_APPLICABLE back to NOT_STARTED", async () => {
    vi.mocked(prisma.complianceRequirement.findUniqueOrThrow).mockResolvedValue({
      id: "req-20",
      status: "NOT_APPLICABLE",
    } as never);
    vi.mocked(prisma.complianceRequirement.update).mockResolvedValue({} as never);

    await expect(transitionRequirement("req-20", "reopen", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/compliance/req-20",
    );
    expect(requirePermission).toHaveBeenCalledWith("compliance:verify");
    expect(prisma.complianceRequirement.update).toHaveBeenCalledWith({
      where: { id: "req-20" },
      data: { status: "NOT_STARTED" },
    });
  });

  it("does not crash on an illegal transition (race condition) — redirects back with an error", async () => {
    vi.mocked(prisma.complianceRequirement.findUniqueOrThrow).mockResolvedValue({
      id: "req-1",
      status: "NOT_STARTED",
    } as never);

    await expect(transitionRequirement("req-1", "verify", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/compliance/req-1?workflowError=",
    );
    expect(prisma.complianceRequirement.update).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      expect.stringContaining("/admin/compliance/req-1?workflowError="),
    );
  });
});

describe("addEvidence", () => {
  it("requires compliance:view", async () => {
    vi.mocked(prisma.complianceEvidence.create).mockResolvedValue({ id: "ev-1" } as never);

    await expect(
      addEvidence(
        "req-1",
        { error: null },
        formData({ entityType: "Faculty", entityId: "fac-1" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/compliance/req-1");
    expect(requirePermission).toHaveBeenCalledWith("compliance:view");
  });

  it("rejects a blank entity type/id without touching the database", async () => {
    const result = await addEvidence(
      "req-1",
      { error: null },
      formData({ entityType: "", entityId: "" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.complianceEvidence.create).not.toHaveBeenCalled();
  });

  it("creates the evidence row and logs a COMPLIANCE_EVIDENCE_ADDED audit entry", async () => {
    vi.mocked(prisma.complianceEvidence.create).mockResolvedValue({ id: "ev-1" } as never);

    await expect(
      addEvidence(
        "req-1",
        { error: null },
        formData({ entityType: "Faculty", entityId: "fac-1", note: "Example note" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/compliance/req-1");

    expect(prisma.complianceEvidence.create).toHaveBeenCalledWith({
      data: {
        requirementId: "req-1",
        entityType: "Faculty",
        entityId: "fac-1",
        note: "Example note",
        addedById: "user-1",
      },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "COMPLIANCE_EVIDENCE_ADDED",
          entityType: "ComplianceRequirement",
          entityId: "req-1",
        }),
      }),
    );
  });
});
