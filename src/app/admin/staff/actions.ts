"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { applyWorkflowTransition, WorkflowError, type WorkflowActionName } from "@/lib/content-workflow";
import { logAudit } from "@/lib/audit";
import { getPrimaryCollege } from "@/lib/content";

const PERMISSIONS = MODULE_PERMISSIONS.staff;
const ENTITY_TYPE = "Staff";

const staffSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  designation: z.string().trim().min(1, "Designation is required").max(200),
  department: z.string().trim().max(200).optional(),
});

export type StaffFormState = { error: string | null };

function parseForm(formData: FormData) {
  return staffSchema.safeParse({
    name: formData.get("name"),
    designation: formData.get("designation"),
    department: formData.get("department") || undefined,
  });
}

export async function createStaff(
  _prevState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { error: "No college record exists yet — cannot create content." };
  }

  const staff = await prisma.staff.create({
    data: {
      collegeId: college.id,
      name: parsed.data.name,
      designation: parsed.data.designation,
      department: parsed.data.department || null,
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
    entityId: staff.id,
    after: staff,
  });

  redirect(`/admin/staff/${staff.id}`);
}

export async function updateStaff(
  id: string,
  _prevState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.staff.findUnique({ where: { id } });
  if (!before) {
    return { error: "Staff record not found." };
  }

  const after = await prisma.staff.update({
    where: { id },
    data: {
      name: parsed.data.name,
      designation: parsed.data.designation,
      department: parsed.data.department || null,
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

  redirect(`/admin/staff/${id}`);
}

export async function transitionStaff(
  id: string,
  action: WorkflowActionName,
  _formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    action === "submit_for_review" ? PERMISSIONS.manage : PERMISSIONS.publish,
  );

  const staff = await prisma.staff.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: staff.status,
      action,
      actorId: user.id,
      update: (data) => prisma.staff.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
  }

  redirect(`/admin/staff/${id}`);
}
