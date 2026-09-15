"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { getPrimaryCollege } from "@/lib/content";
import { buildComplianceReportSnapshot } from "@/lib/compliance";
import { logAudit } from "@/lib/audit";

const ENTITY_TYPE = "ComplianceReportExport";

const generateSchema = z.object({
  websiteUrl: z.string().trim().min(1, "Website URL is required").url("Enter a valid URL").max(500),
});

export type GenerateReportState = { error: string | null };

/**
 * Generates a new compliance report snapshot (CLAUDE.md rule 7 — gated on `compliance:verify`,
 * the same Principal/Administrator/Super Admin authority that verifies individual
 * requirements, matching docs/compliance-matrix.md's "Verified by: Principal (signs off
 * before submission)"). Never requires every requirement to be VERIFIED first — a college can
 * report partial progress toward the circular's 1-month launch deadline.
 */
export async function generateComplianceReport(
  _prevState: GenerateReportState,
  formData: FormData,
): Promise<GenerateReportState> {
  const user = await requirePermission("compliance:verify");

  const parsed = generateSchema.safeParse({ websiteUrl: formData.get("websiteUrl") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { error: "No college record found." };
  }

  const snapshotItems = await buildComplianceReportSnapshot();

  const report = await prisma.complianceReportExport.create({
    data: {
      collegeId: college.id,
      generatedById: user.id,
      websiteUrl: parsed.data.websiteUrl,
      snapshot: JSON.parse(JSON.stringify(snapshotItems)),
    },
  });

  await logAudit({
    actorId: user.id,
    action: "COMPLIANCE_REPORT_GENERATED",
    entityType: ENTITY_TYPE,
    entityId: report.id,
    after: {
      websiteUrl: report.websiteUrl,
      verifiedCount: snapshotItems.filter((item) => item.status === "VERIFIED").length,
      totalCount: snapshotItems.length,
    },
  });

  redirect("/admin/compliance/reports");
}

/**
 * Records that a previously-generated report was actually submitted to the Office of the
 * Inspector of Colleges. One-way: a report that already has `submittedAt` set cannot be
 * re-submitted or have its submission date overwritten, since that timestamp is itself part
 * of the compliance record (CLAUDE.md rule 8).
 */
export async function recordComplianceReportSubmission(reportId: string): Promise<void> {
  const user = await requirePermission("compliance:verify");

  const report = await prisma.complianceReportExport.findUniqueOrThrow({ where: { id: reportId } });

  if (report.submittedAt) {
    redirect(
      `/admin/compliance/reports?reportError=${encodeURIComponent("This report has already been marked submitted.")}`,
    );
  }

  await prisma.complianceReportExport.update({
    where: { id: reportId },
    data: { submittedAt: new Date(), submittedById: user.id },
  });

  await logAudit({
    actorId: user.id,
    action: "COMPLIANCE_REPORT_SUBMITTED",
    entityType: ENTITY_TYPE,
    entityId: reportId,
    before: { submittedAt: null },
    after: { submittedAt: new Date().toISOString(), submittedById: user.id },
  });

  redirect("/admin/compliance/reports");
}
