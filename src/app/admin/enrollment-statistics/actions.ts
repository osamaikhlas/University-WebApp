"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { applyWorkflowTransition, WorkflowError, type WorkflowActionName } from "@/lib/content-workflow";
import { logAudit } from "@/lib/audit";
import { getPrimaryCollege } from "@/lib/content";

const PERMISSIONS = MODULE_PERMISSIONS.enrollmentStatistics;
const ENTITY_TYPE = "EnrollmentStatistic";

const enrollmentStatisticSchema = z.object({
  programId: z.string().trim().min(1, "Program is required"),
  academicYear: z.string().trim().min(1, "Academic year is required").max(20),
  sessionType: z.string().trim().max(100).optional(),
  totalEnrolled: z.coerce
    .number({ error: "Enter a valid number" })
    .int("Must be a whole number")
    .min(0, "Must be zero or greater"),
  maleCount: z.coerce.number().int().min(0, "Must be zero or greater").optional(),
  femaleCount: z.coerce.number().int().min(0, "Must be zero or greater").optional(),
});

export type EnrollmentStatisticFormState = { error: string | null };

function parseForm(formData: FormData) {
  return enrollmentStatisticSchema.safeParse({
    programId: formData.get("programId"),
    academicYear: formData.get("academicYear"),
    sessionType: formData.get("sessionType") || undefined,
    totalEnrolled: formData.get("totalEnrolled"),
    // `|| undefined` (not `?? ""`) so a blank field is genuinely omitted rather than
    // coerced through the number parser, where `Number("") === 0` would silently turn
    // "not recorded" into a real zero (CLAUDE.md rule 1 — never invent data).
    maleCount: formData.get("maleCount") || undefined,
    femaleCount: formData.get("femaleCount") || undefined,
  });
}

async function resolveProgramId(
  programId: string,
  collegeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || program.collegeId !== collegeId) {
    return { ok: false, error: "Select a valid program." };
  }
  return { ok: true };
}

export async function createEnrollmentStatistic(
  _prevState: EnrollmentStatisticFormState,
  formData: FormData,
): Promise<EnrollmentStatisticFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { error: "No college record exists yet — cannot create content." };
  }

  const program = await resolveProgramId(parsed.data.programId, college.id);
  if (!program.ok) return { error: program.error };

  const enrollmentStatistic = await prisma.enrollmentStatistic.create({
    data: {
      collegeId: college.id,
      programId: parsed.data.programId,
      academicYear: parsed.data.academicYear,
      sessionType: parsed.data.sessionType || null,
      totalEnrolled: parsed.data.totalEnrolled,
      maleCount: parsed.data.maleCount ?? null,
      femaleCount: parsed.data.femaleCount ?? null,
      status: "DRAFT",
      isPlaceholder: false,
      createdBy: user.id,
      updatedBy: user.id,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "CREATE",
    entityType: ENTITY_TYPE,
    entityId: enrollmentStatistic.id,
    after: enrollmentStatistic,
  });

  redirect(`/admin/enrollment-statistics/${enrollmentStatistic.id}`);
}

export async function updateEnrollmentStatistic(
  id: string,
  _prevState: EnrollmentStatisticFormState,
  formData: FormData,
): Promise<EnrollmentStatisticFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.enrollmentStatistic.findUnique({ where: { id } });
  if (!before) {
    return { error: "Enrollment statistic not found." };
  }

  const program = await resolveProgramId(parsed.data.programId, before.collegeId);
  if (!program.ok) return { error: program.error };

  const after = await prisma.enrollmentStatistic.update({
    where: { id },
    data: {
      programId: parsed.data.programId,
      academicYear: parsed.data.academicYear,
      sessionType: parsed.data.sessionType || null,
      totalEnrolled: parsed.data.totalEnrolled,
      maleCount: parsed.data.maleCount ?? null,
      femaleCount: parsed.data.femaleCount ?? null,
      updatedBy: user.id,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entityType: ENTITY_TYPE,
    entityId: id,
    before,
    after,
  });

  redirect(`/admin/enrollment-statistics/${id}`);
}

export async function transitionEnrollmentStatistic(
  id: string,
  action: WorkflowActionName,
  _formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    action === "submit_for_review" ? PERMISSIONS.manage : PERMISSIONS.publish,
  );

  const enrollmentStatistic = await prisma.enrollmentStatistic.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: enrollmentStatistic.status,
      action,
      actorId: user.id,
      update: (data) => prisma.enrollmentStatistic.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
  }

  redirect(`/admin/enrollment-statistics/${id}`);
}
