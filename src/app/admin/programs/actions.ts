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

const PERMISSIONS = MODULE_PERMISSIONS.programs;
const ENTITY_TYPE = "Program";

const PROGRAM_LEVELS = ["UNDERGRADUATE", "GRADUATE", "DIPLOMA", "CERTIFICATE"] as const;

const programSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  departmentId: z.string().trim().min(1, "Department is required"),
  level: z.enum(PROGRAM_LEVELS, { message: "Select a valid program level" }),
  durationYears: z.coerce.number().int().min(1, "Duration must be at least 1 year").max(10),
  description: z.string().trim().max(2000).optional(),
});

export type ProgramFormState = { error: string | null };

function parseForm(formData: FormData) {
  return programSchema.safeParse({
    name: formData.get("name"),
    departmentId: formData.get("departmentId"),
    level: formData.get("level"),
    durationYears: formData.get("durationYears"),
    description: formData.get("description") || undefined,
  });
}

export async function createProgram(
  _prevState: ProgramFormState,
  formData: FormData,
): Promise<ProgramFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { error: "No college record exists yet — cannot create content." };
  }

  const department = await prisma.department.findUnique({
    where: { id: parsed.data.departmentId },
  });
  if (!department || department.collegeId !== college.id) {
    return { error: "Select a valid department." };
  }

  const program = await prisma.program.create({
    data: {
      collegeId: college.id,
      departmentId: parsed.data.departmentId,
      name: parsed.data.name,
      level: parsed.data.level,
      durationYears: parsed.data.durationYears,
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
    entityId: program.id,
    after: program,
  });

  redirect(`/admin/programs/${program.id}`);
}

export async function updateProgram(
  id: string,
  _prevState: ProgramFormState,
  formData: FormData,
): Promise<ProgramFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.program.findUnique({ where: { id } });
  if (!before) {
    return { error: "Program not found." };
  }

  const department = await prisma.department.findUnique({
    where: { id: parsed.data.departmentId },
  });
  if (!department || department.collegeId !== before.collegeId) {
    return { error: "Select a valid department." };
  }

  const after = await prisma.program.update({
    where: { id },
    data: {
      name: parsed.data.name,
      departmentId: parsed.data.departmentId,
      level: parsed.data.level,
      durationYears: parsed.data.durationYears,
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

  redirect(`/admin/programs/${id}`);
}

export async function transitionProgram(
  id: string,
  action: WorkflowActionName,
  formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    MANAGE_PERMISSION_ACTIONS.has(action) ? PERMISSIONS.manage : PERMISSIONS.publish,
  );
  const comment = formData.get("comment")?.toString();

  const program = await prisma.program.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: program.status,
      action,
      actorId: user.id,
      comment,
      update: (data) => prisma.program.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    redirect(`/admin/programs/${id}?workflowError=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/programs/${id}`);
}
