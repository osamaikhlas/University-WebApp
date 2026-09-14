"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { optionalDateField } from "@/lib/admin/zod-helpers";
import {
  applyWorkflowTransition,
  WorkflowError,
  MANAGE_PERMISSION_ACTIONS,
  type WorkflowActionName,
} from "@/lib/content-workflow";
import { logAudit } from "@/lib/audit";
import { getPrimaryCollege } from "@/lib/content";

const PERMISSIONS = MODULE_PERMISSIONS.examinations;
const ENTITY_TYPE = "Examination";

const examinationSchema = z.object({
  programId: z.string().trim().min(1, "Program is required"),
  examType: z.string().trim().min(1, "Exam type is required").max(200),
  academicYear: z.string().trim().max(20).optional(),
  scheduleStartDate: optionalDateField,
  scheduleEndDate: optionalDateField,
  noticeId: z.string().trim().optional(),
});

export type ExaminationFormState = { error: string | null };

function parseForm(formData: FormData) {
  return examinationSchema.safeParse({
    programId: formData.get("programId"),
    examType: formData.get("examType"),
    academicYear: formData.get("academicYear") || undefined,
    scheduleStartDate: formData.get("scheduleStartDate") || undefined,
    scheduleEndDate: formData.get("scheduleEndDate") || undefined,
    noticeId: formData.get("noticeId") || undefined,
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

async function resolveNoticeId(
  noticeId: string | undefined,
  collegeId: string,
): Promise<{ ok: true; noticeId: string | null } | { ok: false; error: string }> {
  if (!noticeId) return { ok: true, noticeId: null };
  const notice = await prisma.notice.findUnique({ where: { id: noticeId } });
  if (!notice || notice.collegeId !== collegeId) {
    return { ok: false, error: "Select a valid notice." };
  }
  return { ok: true, noticeId };
}

export async function createExamination(
  _prevState: ExaminationFormState,
  formData: FormData,
): Promise<ExaminationFormState> {
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

  const notice = await resolveNoticeId(parsed.data.noticeId, college.id);
  if (!notice.ok) return { error: notice.error };

  const examination = await prisma.examination.create({
    data: {
      collegeId: college.id,
      programId: parsed.data.programId,
      examType: parsed.data.examType,
      academicYear: parsed.data.academicYear || null,
      scheduleStartDate: parsed.data.scheduleStartDate ?? null,
      scheduleEndDate: parsed.data.scheduleEndDate ?? null,
      noticeId: notice.noticeId,
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
    entityId: examination.id,
    after: examination,
  });

  redirect(`/admin/exams/${examination.id}`);
}

export async function updateExamination(
  id: string,
  _prevState: ExaminationFormState,
  formData: FormData,
): Promise<ExaminationFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.examination.findUnique({ where: { id } });
  if (!before) {
    return { error: "Examination not found." };
  }

  const program = await resolveProgramId(parsed.data.programId, before.collegeId);
  if (!program.ok) return { error: program.error };

  const notice = await resolveNoticeId(parsed.data.noticeId, before.collegeId);
  if (!notice.ok) return { error: notice.error };

  const after = await prisma.examination.update({
    where: { id },
    data: {
      programId: parsed.data.programId,
      examType: parsed.data.examType,
      academicYear: parsed.data.academicYear || null,
      scheduleStartDate: parsed.data.scheduleStartDate ?? null,
      scheduleEndDate: parsed.data.scheduleEndDate ?? null,
      noticeId: notice.noticeId,
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

  redirect(`/admin/exams/${id}`);
}

export async function transitionExamination(
  id: string,
  action: WorkflowActionName,
  formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    MANAGE_PERMISSION_ACTIONS.has(action) ? PERMISSIONS.manage : PERMISSIONS.publish,
  );
  const comment = formData.get("comment")?.toString();

  const examination = await prisma.examination.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: examination.status,
      action,
      actorId: user.id,
      comment,
      update: (data) => prisma.examination.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    redirect(`/admin/exams/${id}?workflowError=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/exams/${id}`);
}
