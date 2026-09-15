import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    complianceReportExport: {
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/guard", () => ({ requirePermission: vi.fn() }));
vi.mock("@/lib/content", () => ({ getPrimaryCollege: vi.fn() }));
vi.mock("@/lib/compliance", () => ({ buildComplianceReportSnapshot: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { getPrimaryCollege } from "@/lib/content";
import { buildComplianceReportSnapshot } from "@/lib/compliance";
import { logAudit } from "@/lib/audit";
import {
  generateComplianceReport,
  recordComplianceReportSubmission,
} from "@/app/admin/compliance/report-actions";

const fakeUser = { id: "user-1", collegeId: "college-1", permissions: new Set() } as never;
const college = { id: "college-1" } as never;

const SNAPSHOT = [
  {
    itemNumber: 1,
    title: "College profile",
    status: "VERIFIED",
    completenessPercent: 100,
    verifiedAt: null,
    verifiedByName: null,
  },
  {
    itemNumber: 2,
    title: "Day-to-day activities",
    status: "IN_PROGRESS",
    completenessPercent: 40,
    verifiedAt: null,
    verifiedByName: null,
  },
] as never;

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue(fakeUser);
  vi.mocked(getPrimaryCollege).mockResolvedValue(college);
  vi.mocked(buildComplianceReportSnapshot).mockResolvedValue(SNAPSHOT);
});

describe("generateComplianceReport", () => {
  it("requires compliance:verify (never compliance:view)", async () => {
    vi.mocked(prisma.complianceReportExport.create).mockResolvedValue({ id: "report-1" } as never);

    await expect(
      generateComplianceReport(
        { error: null },
        formData({ websiteUrl: "https://example-college.edu.pk" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/compliance/reports");

    expect(requirePermission).toHaveBeenCalledWith("compliance:verify");
  });

  it("rejects a missing or invalid website URL without touching the database", async () => {
    const result = await generateComplianceReport(
      { error: null },
      formData({ websiteUrl: "not-a-url" }),
    );
    expect(result.error).toBeTruthy();
    expect(prisma.complianceReportExport.create).not.toHaveBeenCalled();
  });

  it("does not require every requirement to be verified before generating", async () => {
    vi.mocked(prisma.complianceReportExport.create).mockResolvedValue({ id: "report-1" } as never);

    await expect(
      generateComplianceReport(
        { error: null },
        formData({ websiteUrl: "https://example-college.edu.pk" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/compliance/reports");

    // SNAPSHOT above has one VERIFIED and one IN_PROGRESS item — generation still succeeds.
    expect(prisma.complianceReportExport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        collegeId: "college-1",
        generatedById: "user-1",
        websiteUrl: "https://example-college.edu.pk",
        snapshot: SNAPSHOT,
      }),
    });
  });

  it("writes an audit entry recording the verified/total counts at generation time", async () => {
    vi.mocked(prisma.complianceReportExport.create).mockResolvedValue({
      id: "report-1",
      websiteUrl: "https://example-college.edu.pk",
    } as never);

    await expect(
      generateComplianceReport(
        { error: null },
        formData({ websiteUrl: "https://example-college.edu.pk" }),
      ),
    ).rejects.toThrow();

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "user-1",
        action: "COMPLIANCE_REPORT_GENERATED",
        entityType: "ComplianceReportExport",
        entityId: "report-1",
        after: expect.objectContaining({ verifiedCount: 1, totalCount: 2 }),
      }),
    );
  });
});

describe("recordComplianceReportSubmission", () => {
  it("requires compliance:verify", async () => {
    vi.mocked(prisma.complianceReportExport.findUniqueOrThrow).mockResolvedValue({
      id: "report-1",
      submittedAt: null,
    } as never);
    vi.mocked(prisma.complianceReportExport.update).mockResolvedValue({} as never);

    await expect(recordComplianceReportSubmission("report-1")).rejects.toThrow(
      "REDIRECT:/admin/compliance/reports",
    );
    expect(requirePermission).toHaveBeenCalledWith("compliance:verify");
    expect(prisma.complianceReportExport.update).toHaveBeenCalledWith({
      where: { id: "report-1" },
      data: expect.objectContaining({ submittedById: "user-1" }),
    });
  });

  it("is one-way: refuses to re-submit a report that already has submittedAt set", async () => {
    vi.mocked(prisma.complianceReportExport.findUniqueOrThrow).mockResolvedValue({
      id: "report-1",
      submittedAt: new Date("2026-01-01"),
    } as never);

    await expect(recordComplianceReportSubmission("report-1")).rejects.toThrow(
      /REDIRECT:\/admin\/compliance\/reports\?reportError=/,
    );
    expect(prisma.complianceReportExport.update).not.toHaveBeenCalled();
    expect(logAudit).not.toHaveBeenCalled();
  });
});
