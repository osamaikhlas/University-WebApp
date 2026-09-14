"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { applyWorkflowTransition, WorkflowError, type WorkflowActionName } from "@/lib/content-workflow";
import { logAudit } from "@/lib/audit";
import { getPrimaryCollege } from "@/lib/content";

const PERMISSIONS = MODULE_PERMISSIONS.clubs;
const ENTITY_TYPE = "Club";

const clubSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(300),
  description: z.string().trim().max(4000).optional(),
  facultyAdvisorId: z.string().trim().optional(),
});

export type ClubFormState = { error: string | null };

function parseForm(formData: FormData) {
  return clubSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    facultyAdvisorId: formData.get("facultyAdvisorId") || undefined,
  });
}

async function resolveFacultyAdvisorId(
  facultyAdvisorId: string | undefined,
  collegeId: string,
): Promise<{ ok: true; facultyAdvisorId: string | null } | { ok: false; error: string }> {
  if (!facultyAdvisorId) return { ok: true, facultyAdvisorId: null };
  const faculty = await prisma.faculty.findUnique({ where: { id: facultyAdvisorId } });
  if (!faculty || faculty.collegeId !== collegeId) {
    return { ok: false, error: "Select a valid faculty advisor." };
  }
  return { ok: true, facultyAdvisorId };
}

export async function createClub(
  _prevState: ClubFormState,
  formData: FormData,
): Promise<ClubFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { error: "No college record exists yet — cannot create content." };
  }

  const advisor = await resolveFacultyAdvisorId(parsed.data.facultyAdvisorId, college.id);
  if (!advisor.ok) return { error: advisor.error };

  const club = await prisma.club.create({
    data: {
      collegeId: college.id,
      facultyAdvisorId: advisor.facultyAdvisorId,
      name: parsed.data.name,
      description: parsed.data.description || null,
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
    entityId: club.id,
    after: club,
  });

  redirect(`/admin/clubs/${club.id}`);
}

export async function updateClub(
  id: string,
  _prevState: ClubFormState,
  formData: FormData,
): Promise<ClubFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.club.findUnique({ where: { id } });
  if (!before) {
    return { error: "Club not found." };
  }

  const advisor = await resolveFacultyAdvisorId(parsed.data.facultyAdvisorId, before.collegeId);
  if (!advisor.ok) return { error: advisor.error };

  const after = await prisma.club.update({
    where: { id },
    data: {
      name: parsed.data.name,
      facultyAdvisorId: advisor.facultyAdvisorId,
      description: parsed.data.description || null,
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

  redirect(`/admin/clubs/${id}`);
}

export async function transitionClub(
  id: string,
  action: WorkflowActionName,
  _formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    action === "submit_for_review" ? PERMISSIONS.manage : PERMISSIONS.publish,
  );

  const club = await prisma.club.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: club.status,
      action,
      actorId: user.id,
      update: (data) => prisma.club.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
  }

  redirect(`/admin/clubs/${id}`);
}
