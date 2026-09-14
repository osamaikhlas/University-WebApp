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

const PERMISSIONS = MODULE_PERMISSIONS.affiliation;
const ENTITY_TYPE = "Affiliation";

const affiliationSchema = z.object({
  programId: z.string().trim().optional(),
  universityName: z.string().trim().min(1, "University name is required").max(300),
  affiliationNumber: z.string().trim().max(200).optional(),
  regulatoryBody: z.string().trim().max(300).optional(),
  validFrom: optionalDateField,
  validTo: optionalDateField,
});

export type AffiliationFormState = { error: string | null };

function parseForm(formData: FormData) {
  return affiliationSchema.safeParse({
    programId: formData.get("programId") || undefined,
    universityName: formData.get("universityName"),
    affiliationNumber: formData.get("affiliationNumber") || undefined,
    regulatoryBody: formData.get("regulatoryBody") || undefined,
    validFrom: formData.get("validFrom") || undefined,
    validTo: formData.get("validTo") || undefined,
  });
}

async function resolveProgramId(
  programId: string | undefined,
  collegeId: string,
): Promise<{ ok: true; programId: string | null } | { ok: false; error: string }> {
  if (!programId) return { ok: true, programId: null };
  const program = await prisma.program.findUnique({ where: { id: programId } });
  if (!program || program.collegeId !== collegeId) {
    return { ok: false, error: "Select a valid program." };
  }
  return { ok: true, programId };
}

export async function createAffiliation(
  _prevState: AffiliationFormState,
  formData: FormData,
): Promise<AffiliationFormState> {
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

  const affiliation = await prisma.affiliation.create({
    data: {
      collegeId: college.id,
      programId: program.programId,
      universityName: parsed.data.universityName,
      affiliationNumber: parsed.data.affiliationNumber || null,
      regulatoryBody: parsed.data.regulatoryBody || null,
      validFrom: parsed.data.validFrom ?? null,
      validTo: parsed.data.validTo ?? null,
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
    entityId: affiliation.id,
    after: affiliation,
  });

  redirect(`/admin/affiliation/${affiliation.id}`);
}

export async function updateAffiliation(
  id: string,
  _prevState: AffiliationFormState,
  formData: FormData,
): Promise<AffiliationFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.affiliation.findUnique({ where: { id } });
  if (!before) {
    return { error: "Affiliation not found." };
  }

  const program = await resolveProgramId(parsed.data.programId, before.collegeId);
  if (!program.ok) return { error: program.error };

  const after = await prisma.affiliation.update({
    where: { id },
    data: {
      programId: program.programId,
      universityName: parsed.data.universityName,
      affiliationNumber: parsed.data.affiliationNumber || null,
      regulatoryBody: parsed.data.regulatoryBody || null,
      validFrom: parsed.data.validFrom ?? null,
      validTo: parsed.data.validTo ?? null,
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

  redirect(`/admin/affiliation/${id}`);
}

export async function transitionAffiliation(
  id: string,
  action: WorkflowActionName,
  formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    MANAGE_PERMISSION_ACTIONS.has(action) ? PERMISSIONS.manage : PERMISSIONS.publish,
  );
  const comment = formData.get("comment")?.toString();

  const affiliation = await prisma.affiliation.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: affiliation.status,
      action,
      actorId: user.id,
      comment,
      update: (data) => prisma.affiliation.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    redirect(`/admin/affiliation/${id}?workflowError=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/affiliation/${id}`);
}
