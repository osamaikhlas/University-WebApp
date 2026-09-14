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
 * Location is a singleton per college in practice (one physical address), same as College
 * Profile — but unlike `CollegeProfile.collegeId`, `Location.collegeId` has no `@unique`
 * constraint in the schema, so the "does one already exist" check here uses `findFirst`
 * rather than `findUnique`, matching `getLocation()` in src/lib/content.ts.
 */

const PERMISSIONS = MODULE_PERMISSIONS.location;
const ENTITY_TYPE = "Location";

const locationSchema = z.object({
  address: z.string().trim().min(1, "Address is required").max(1000),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  mapEmbedUrl: z.string().trim().url("Enter a valid URL").max(1000).optional().or(z.literal("")),
});

export type LocationFormState = { error: string | null };

function parseForm(formData: FormData) {
  return locationSchema.safeParse({
    address: formData.get("address"),
    latitude: formData.get("latitude") || undefined,
    longitude: formData.get("longitude") || undefined,
    mapEmbedUrl: formData.get("mapEmbedUrl") || "",
  });
}

export async function createLocation(
  _prevState: LocationFormState,
  formData: FormData,
): Promise<LocationFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { error: "No college record exists yet — cannot create content." };
  }

  const existing = await prisma.location.findFirst({ where: { collegeId: college.id } });
  if (existing) {
    redirect("/admin/location/edit");
  }

  const location = await prisma.location.create({
    data: {
      collegeId: college.id,
      address: parsed.data.address,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      mapEmbedUrl: parsed.data.mapEmbedUrl || null,
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
    entityId: location.id,
    after: location,
  });

  redirect("/admin/location");
}

export async function updateLocation(
  _prevState: LocationFormState,
  formData: FormData,
): Promise<LocationFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  const before = college
    ? await prisma.location.findFirst({ where: { collegeId: college.id } })
    : null;
  if (!before) {
    return { error: "Location not found." };
  }

  const after = await prisma.location.update({
    where: { id: before.id },
    data: {
      address: parsed.data.address,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      mapEmbedUrl: parsed.data.mapEmbedUrl || null,
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

  redirect("/admin/location");
}

export async function transitionLocation(
  id: string,
  action: WorkflowActionName,
  formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    MANAGE_PERMISSION_ACTIONS.has(action) ? PERMISSIONS.manage : PERMISSIONS.publish,
  );
  const comment = formData.get("comment")?.toString();

  const location = await prisma.location.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: location.status,
      action,
      actorId: user.id,
      comment,
      update: (data) => prisma.location.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    redirect(`/admin/location?workflowError=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/location`);
}
