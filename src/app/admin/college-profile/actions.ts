"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import {
  applyWorkflowTransition,
  WorkflowError,
  MANAGE_PERMISSION_ACTIONS,
  type WorkflowActionName,
} from "@/lib/content-workflow";
import { logAudit } from "@/lib/audit";
import { getPrimaryCollege } from "@/lib/content";

/**
 * College Profile is a singleton per college (`CollegeProfile.collegeId` is `@unique` —
 * see prisma/schema.prisma), unlike the other 4 CMS modules. There is exactly one record's
 * lifecycle to manage, not a list of many, so "create" only ever runs once per college and
 * every other route just redirects to the one profile that exists.
 */

const PERMISSIONS = MODULE_PERMISSIONS.collegeProfile;
const ENTITY_TYPE = "CollegeProfile";

const profileSchema = z.object({
  overview: z.string().trim().max(4000).optional(),
  missionStatement: z.string().trim().max(2000).optional(),
  visionStatement: z.string().trim().max(2000).optional(),
  history: z.string().trim().max(4000).optional(),
  principalName: z.string().trim().max(200).optional(),
  principalMessage: z.string().trim().max(4000).optional(),
  establishedYear: z.coerce.number().int().min(1800).max(2100).optional().or(z.literal("")),
});

export type CollegeProfileFormState = { error: string | null };

function parseForm(formData: FormData) {
  return profileSchema.safeParse({
    overview: formData.get("overview") || undefined,
    missionStatement: formData.get("missionStatement") || undefined,
    visionStatement: formData.get("visionStatement") || undefined,
    history: formData.get("history") || undefined,
    principalName: formData.get("principalName") || undefined,
    principalMessage: formData.get("principalMessage") || undefined,
    establishedYear: formData.get("establishedYear") || "",
  });
}

export async function createCollegeProfile(
  _prevState: CollegeProfileFormState,
  formData: FormData,
): Promise<CollegeProfileFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { error: "No college record exists yet — cannot create content." };
  }

  const existing = await prisma.collegeProfile.findUnique({ where: { collegeId: college.id } });
  if (existing) {
    redirect("/admin/college-profile/edit");
  }

  const establishedYear =
    parsed.data.establishedYear === "" ? undefined : parsed.data.establishedYear;

  const profile = await prisma.collegeProfile.create({
    data: {
      collegeId: college.id,
      overview: parsed.data.overview || null,
      missionStatement: parsed.data.missionStatement || null,
      visionStatement: parsed.data.visionStatement || null,
      history: parsed.data.history || null,
      principalName: parsed.data.principalName || null,
      principalMessage: parsed.data.principalMessage || null,
      establishedYear: establishedYear ?? null,
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
    entityId: profile.id,
    after: profile,
  });

  redirect("/admin/college-profile");
}

export async function updateCollegeProfile(
  _prevState: CollegeProfileFormState,
  formData: FormData,
): Promise<CollegeProfileFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  const before = college
    ? await prisma.collegeProfile.findUnique({ where: { collegeId: college.id } })
    : null;
  if (!before) {
    return { error: "College profile not found." };
  }

  const establishedYear =
    parsed.data.establishedYear === "" ? undefined : parsed.data.establishedYear;

  const after = await prisma.collegeProfile.update({
    where: { id: before.id },
    data: {
      overview: parsed.data.overview || null,
      missionStatement: parsed.data.missionStatement || null,
      visionStatement: parsed.data.visionStatement || null,
      history: parsed.data.history || null,
      principalName: parsed.data.principalName || null,
      principalMessage: parsed.data.principalMessage || null,
      establishedYear: establishedYear ?? null,
      updatedBy: user.id,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entityType: ENTITY_TYPE,
    entityId: before.id,
    before,
    after,
  });

  redirect("/admin/college-profile");
}

export async function transitionCollegeProfile(
  id: string,
  action: WorkflowActionName,
  formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    MANAGE_PERMISSION_ACTIONS.has(action) ? PERMISSIONS.manage : PERMISSIONS.publish,
  );
  const comment = formData.get("comment")?.toString();

  const profile = await prisma.collegeProfile.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: profile.status,
      action,
      actorId: user.id,
      comment,
      update: (data) => prisma.collegeProfile.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    redirect(`/admin/college-profile?workflowError=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/college-profile`);
}
