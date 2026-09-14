"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { optionalDateField, requiredDateField } from "@/lib/admin/zod-helpers";
import { applyWorkflowTransition, WorkflowError, type WorkflowActionName } from "@/lib/content-workflow";
import { logAudit } from "@/lib/audit";
import { getPrimaryCollege } from "@/lib/content";

const PERMISSIONS = MODULE_PERMISSIONS.academicCalendar;
const ENTITY_TYPE = "AcademicCalendar";

const calendarSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z.string().trim().max(2000).optional(),
  startDate: requiredDateField,
  endDate: optionalDateField,
  category: z.string().trim().max(100).optional(),
  academicYear: z.string().trim().max(20).optional(),
});

export type AcademicCalendarFormState = { error: string | null };

function parseForm(formData: FormData) {
  return calendarSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
    category: formData.get("category") || undefined,
    academicYear: formData.get("academicYear") || undefined,
  });
}

export async function createAcademicCalendarEntry(
  _prevState: AcademicCalendarFormState,
  formData: FormData,
): Promise<AcademicCalendarFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { error: "No college record exists yet — cannot create content." };
  }

  const entry = await prisma.academicCalendar.create({
    data: {
      collegeId: college.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate ?? null,
      category: parsed.data.category || null,
      academicYear: parsed.data.academicYear || null,
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
    entityId: entry.id,
    after: entry,
  });

  redirect(`/admin/academic-calendar/${entry.id}`);
}

export async function updateAcademicCalendarEntry(
  id: string,
  _prevState: AcademicCalendarFormState,
  formData: FormData,
): Promise<AcademicCalendarFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.academicCalendar.findUnique({ where: { id } });
  if (!before) {
    return { error: "Academic calendar entry not found." };
  }

  const after = await prisma.academicCalendar.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate ?? null,
      category: parsed.data.category || null,
      academicYear: parsed.data.academicYear || null,
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

  redirect(`/admin/academic-calendar/${id}`);
}

export async function transitionAcademicCalendarEntry(
  id: string,
  action: WorkflowActionName,
  _formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    action === "submit_for_review" ? PERMISSIONS.manage : PERMISSIONS.publish,
  );

  const entry = await prisma.academicCalendar.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: entry.status,
      action,
      actorId: user.id,
      update: (data) => prisma.academicCalendar.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
  }

  redirect(`/admin/academic-calendar/${id}`);
}
