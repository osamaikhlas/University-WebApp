"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import {
  applyGrievanceTransition,
  assignGrievance,
  GrievanceWorkflowError,
  type GrievanceActionName,
} from "@/lib/grievance-workflow";
import { getEligibleGrievanceAssignees } from "@/lib/admin/grievance-assignees";
import { logAudit } from "@/lib/audit";

/**
 * Every action here requires `grievances:manage` (the higher-trust action grant —
 * `grievances:view` alone can see a grievance's details but not touch it). Currently
 * `grievances:view`/`grievances:manage` are always granted together (PRINCIPAL/ADMINISTRATOR/
 * SUPER_ADMIN — see docs/permission-matrix.md), but each action still checks `manage`
 * explicitly rather than assuming that, so a future role with view-only access is safe by
 * construction (CLAUDE.md rule 5).
 */

export async function transitionGrievanceAction(
  id: string,
  action: GrievanceActionName,
  formData: FormData,
): Promise<void> {
  const user = await requirePermission("grievances:manage");
  const comment = formData.get("comment")?.toString();

  const grievance = await prisma.grievance.findUniqueOrThrow({ where: { id } });

  try {
    await applyGrievanceTransition({
      grievanceId: id,
      currentStatus: grievance.status,
      action,
      actorId: user.id,
      comment,
    });
  } catch (error) {
    if (!(error instanceof GrievanceWorkflowError)) throw error;
    redirect(`/admin/grievances/${id}?workflowError=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/grievances/${id}`);
}

export async function assignGrievanceAction(id: string, formData: FormData): Promise<void> {
  const user = await requirePermission("grievances:manage");
  const assigneeId = formData.get("assigneeId")?.toString();

  const grievance = await prisma.grievance.findUniqueOrThrow({ where: { id } });

  if (!assigneeId) {
    redirect(`/admin/grievances/${id}?workflowError=${encodeURIComponent("Select a staff member to assign.")}`);
  }

  const eligible = await getEligibleGrievanceAssignees(grievance.collegeId);
  if (!eligible.some((candidate) => candidate.id === assigneeId)) {
    redirect(
      `/admin/grievances/${id}?workflowError=${encodeURIComponent("That user cannot be assigned grievances.")}`,
    );
  }

  try {
    await assignGrievance({
      grievanceId: id,
      currentStatus: grievance.status,
      currentAssigneeId: grievance.assignedToId,
      assigneeId,
      actorId: user.id,
    });
  } catch (error) {
    if (!(error instanceof GrievanceWorkflowError)) throw error;
    redirect(`/admin/grievances/${id}?workflowError=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/grievances/${id}`);
}

const noteSchema = z.object({
  note: z.string().trim().min(1, "Note cannot be empty.").max(4000),
});

export async function addGrievanceNoteAction(id: string, formData: FormData): Promise<void> {
  const user = await requirePermission("grievances:manage");

  const parsed = noteSchema.safeParse({ note: formData.get("note") });
  if (!parsed.success) {
    redirect(
      `/admin/grievances/${id}?noteError=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid note.")}`,
    );
  }

  const note = await prisma.grievanceNote.create({
    data: { grievanceId: id, authorId: user.id, note: parsed.data.note },
  });

  await logAudit({
    actorId: user.id,
    action: "GRIEVANCE_NOTE_ADDED",
    entityType: "Grievance",
    entityId: id,
    after: { noteId: note.id, note: note.note },
    comment: "Internal case note added.",
  });

  redirect(`/admin/grievances/${id}`);
}

const responseSchema = z.object({
  message: z.string().trim().min(1, "Response cannot be empty.").max(4000),
});

export async function addGrievanceResponseAction(id: string, formData: FormData): Promise<void> {
  const user = await requirePermission("grievances:manage");

  const parsed = responseSchema.safeParse({ message: formData.get("message") });
  if (!parsed.success) {
    redirect(
      `/admin/grievances/${id}?responseError=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid response.")}`,
    );
  }

  const response = await prisma.grievanceResponse.create({
    data: { grievanceId: id, respondedById: user.id, message: parsed.data.message },
  });

  await logAudit({
    actorId: user.id,
    action: "GRIEVANCE_RESPONSE_SENT",
    entityType: "Grievance",
    entityId: id,
    after: { responseId: response.id, message: response.message },
    comment: "Response to submitter recorded.",
  });

  redirect(`/admin/grievances/${id}`);
}
