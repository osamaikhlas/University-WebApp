"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { requiredDateField } from "@/lib/admin/zod-helpers";
import {
  applyWorkflowTransition,
  WorkflowError,
  MANAGE_PERMISSION_ACTIONS,
  type WorkflowActionName,
} from "@/lib/content-workflow";
import { markContentReviewed } from "@/lib/content-review";
import { logAudit } from "@/lib/audit";
import { getPrimaryCollege } from "@/lib/content";

const PERMISSIONS = MODULE_PERMISSIONS.timetables;
const ENTITY_TYPE = "Timetable";

const timetableSchema = z.object({
  programId: z.string().trim().min(1, "Program is required"),
  classGroup: z.string().trim().min(1, "Class/section is required").max(200),
  effectiveFrom: requiredDateField,
  structuredSchedule: z
    .string()
    .trim()
    .optional()
    .refine((value) => {
      if (!value) return true;
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }, "Schedule must be valid JSON, or left blank"),
});

export type TimetableFormState = { error: string | null };

function parseForm(formData: FormData) {
  return timetableSchema.safeParse({
    programId: formData.get("programId"),
    classGroup: formData.get("classGroup"),
    effectiveFrom: formData.get("effectiveFrom"),
    structuredSchedule: formData.get("structuredSchedule") || undefined,
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

export async function createTimetable(
  _prevState: TimetableFormState,
  formData: FormData,
): Promise<TimetableFormState> {
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

  const timetable = await prisma.timetable.create({
    data: {
      collegeId: college.id,
      programId: parsed.data.programId,
      classGroup: parsed.data.classGroup,
      effectiveFrom: parsed.data.effectiveFrom,
      structuredSchedule: parsed.data.structuredSchedule
        ? JSON.parse(parsed.data.structuredSchedule)
        : undefined,
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
    entityId: timetable.id,
    after: timetable,
  });

  redirect(`/admin/timetables/${timetable.id}`);
}

export async function updateTimetable(
  id: string,
  _prevState: TimetableFormState,
  formData: FormData,
): Promise<TimetableFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.timetable.findUnique({ where: { id } });
  if (!before) {
    return { error: "Timetable not found." };
  }

  const program = await resolveProgramId(parsed.data.programId, before.collegeId);
  if (!program.ok) return { error: program.error };

  const after = await prisma.timetable.update({
    where: { id },
    data: {
      programId: parsed.data.programId,
      classGroup: parsed.data.classGroup,
      effectiveFrom: parsed.data.effectiveFrom,
      structuredSchedule: parsed.data.structuredSchedule
        ? JSON.parse(parsed.data.structuredSchedule)
        : null,
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

  redirect(`/admin/timetables/${id}`);
}

export async function transitionTimetable(
  id: string,
  action: WorkflowActionName,
  formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    MANAGE_PERMISSION_ACTIONS.has(action) ? PERMISSIONS.manage : PERMISSIONS.publish,
  );
  const comment = formData.get("comment")?.toString();

  const timetable = await prisma.timetable.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: timetable.status,
      action,
      actorId: user.id,
      comment,
      update: (data) => prisma.timetable.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    redirect(`/admin/timetables/${id}?workflowError=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/timetables/${id}`);
}

/** Confirms the timetable is still accurate as of today — content-review/freshness tracking,
 * distinct from the publish workflow above. Gated on `publish` (not `manage`). */
export async function markTimetableReviewed(id: string): Promise<void> {
  const user = await requirePermission(PERMISSIONS.publish);

  await markContentReviewed({
    entityType: ENTITY_TYPE,
    entityId: id,
    actorId: user.id,
    update: (data) => prisma.timetable.update({ where: { id }, data }),
  });

  redirect(`/admin/timetables/${id}`);
}
