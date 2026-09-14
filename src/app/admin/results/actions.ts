"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { optionalDateField } from "@/lib/admin/zod-helpers";
import { applyWorkflowTransition, WorkflowError, type WorkflowActionName } from "@/lib/content-workflow";
import { logAudit } from "@/lib/audit";
import { getPrimaryCollege } from "@/lib/content";

const PERMISSIONS = MODULE_PERMISSIONS.results;
const ENTITY_TYPE = "Result";

const resultSchema = z.object({
  programId: z.string().trim().min(1, "Program is required"),
  examinationId: z.string().trim().min(1, "Examination is required"),
  publishDate: optionalDateField,
  externalLink: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .max(500)
    .optional()
    .or(z.literal("")),
  isPublic: z.boolean(),
});

export type ResultFormState = { error: string | null };

function parseForm(formData: FormData) {
  return resultSchema.safeParse({
    programId: formData.get("programId"),
    examinationId: formData.get("examinationId"),
    publishDate: formData.get("publishDate") || undefined,
    externalLink: formData.get("externalLink") || "",
    isPublic: formData.get("isPublic") === "on",
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

async function resolveExaminationId(
  examinationId: string,
  collegeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const examination = await prisma.examination.findUnique({ where: { id: examinationId } });
  if (!examination || examination.collegeId !== collegeId) {
    return { ok: false, error: "Select a valid examination." };
  }
  return { ok: true };
}

export async function createResult(
  _prevState: ResultFormState,
  formData: FormData,
): Promise<ResultFormState> {
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

  const examination = await resolveExaminationId(parsed.data.examinationId, college.id);
  if (!examination.ok) return { error: examination.error };

  const result = await prisma.result.create({
    data: {
      collegeId: college.id,
      programId: parsed.data.programId,
      examinationId: parsed.data.examinationId,
      publishDate: parsed.data.publishDate ?? null,
      externalLink: parsed.data.externalLink || null,
      isPublic: parsed.data.isPublic,
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
    entityId: result.id,
    after: result,
  });

  redirect(`/admin/results/${result.id}`);
}

export async function updateResult(
  id: string,
  _prevState: ResultFormState,
  formData: FormData,
): Promise<ResultFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.result.findUnique({ where: { id } });
  if (!before) {
    return { error: "Result not found." };
  }

  const program = await resolveProgramId(parsed.data.programId, before.collegeId);
  if (!program.ok) return { error: program.error };

  const examination = await resolveExaminationId(parsed.data.examinationId, before.collegeId);
  if (!examination.ok) return { error: examination.error };

  const after = await prisma.result.update({
    where: { id },
    data: {
      programId: parsed.data.programId,
      examinationId: parsed.data.examinationId,
      publishDate: parsed.data.publishDate ?? null,
      externalLink: parsed.data.externalLink || null,
      isPublic: parsed.data.isPublic,
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

  redirect(`/admin/results/${id}`);
}

export async function transitionResult(
  id: string,
  action: WorkflowActionName,
  _formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    action === "submit_for_review" ? PERMISSIONS.manage : PERMISSIONS.publish,
  );

  const result = await prisma.result.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: result.status,
      action,
      actorId: user.id,
      update: (data) => prisma.result.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
  }

  redirect(`/admin/results/${id}`);
}
