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
import { markContentReviewed } from "@/lib/content-review";
import { logAudit } from "@/lib/audit";
import { getPrimaryCollege } from "@/lib/content";

const PERMISSIONS = MODULE_PERMISSIONS.faculty;
const ENTITY_TYPE = "Faculty";

const facultySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  departmentId: z.string().trim().min(1, "Department is required"),
  designation: z.string().trim().min(1, "Designation is required").max(200),
  qualifications: z.string().trim().max(500).optional(),
  subjectsTaught: z.string().trim().max(1000).optional(),
  email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional(),
});

export type FacultyFormState = { error: string | null };

function parseForm(formData: FormData) {
  return facultySchema.safeParse({
    name: formData.get("name"),
    departmentId: formData.get("departmentId"),
    designation: formData.get("designation"),
    qualifications: formData.get("qualifications") || undefined,
    subjectsTaught: formData.get("subjectsTaught") || undefined,
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
  });
}

function splitSubjects(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((subject) => subject.trim())
    .filter(Boolean);
}

export async function createFaculty(
  _prevState: FacultyFormState,
  formData: FormData,
): Promise<FacultyFormState> {
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

  const faculty = await prisma.faculty.create({
    data: {
      collegeId: college.id,
      departmentId: parsed.data.departmentId,
      name: parsed.data.name,
      designation: parsed.data.designation,
      qualifications: parsed.data.qualifications || null,
      subjectsTaught: splitSubjects(parsed.data.subjectsTaught),
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
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
    entityId: faculty.id,
    after: faculty,
  });

  redirect(`/admin/faculty/${faculty.id}`);
}

export async function updateFaculty(
  id: string,
  _prevState: FacultyFormState,
  formData: FormData,
): Promise<FacultyFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.faculty.findUnique({ where: { id } });
  if (!before) {
    return { error: "Faculty record not found." };
  }

  const department = await prisma.department.findUnique({
    where: { id: parsed.data.departmentId },
  });
  if (!department || department.collegeId !== before.collegeId) {
    return { error: "Select a valid department." };
  }

  const after = await prisma.faculty.update({
    where: { id },
    data: {
      name: parsed.data.name,
      departmentId: parsed.data.departmentId,
      designation: parsed.data.designation,
      qualifications: parsed.data.qualifications || null,
      subjectsTaught: splitSubjects(parsed.data.subjectsTaught),
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
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

  redirect(`/admin/faculty/${id}`);
}

export async function transitionFaculty(
  id: string,
  action: WorkflowActionName,
  formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    MANAGE_PERMISSION_ACTIONS.has(action) ? PERMISSIONS.manage : PERMISSIONS.publish,
  );
  const comment = formData.get("comment")?.toString();

  const faculty = await prisma.faculty.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: faculty.status,
      action,
      actorId: user.id,
      comment,
      update: (data) => prisma.faculty.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    redirect(`/admin/faculty/${id}?workflowError=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/faculty/${id}`);
}

/** Confirms the faculty record is still accurate as of today — content-review/freshness
 * tracking, distinct from the publish workflow above. Gated on `publish` (not `manage`). */
export async function markFacultyReviewed(id: string): Promise<void> {
  const user = await requirePermission(PERMISSIONS.publish);

  await markContentReviewed({
    entityType: ENTITY_TYPE,
    entityId: id,
    actorId: user.id,
    update: (data) => prisma.faculty.update({ where: { id }, data }),
  });

  redirect(`/admin/faculty/${id}`);
}
