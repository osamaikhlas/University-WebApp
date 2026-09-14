"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { optionalDateField } from "@/lib/admin/zod-helpers";
import { applyWorkflowTransition, WorkflowError, type WorkflowActionName } from "@/lib/content-workflow";
import { logAudit } from "@/lib/audit";
import { getPrimaryCollege } from "@/lib/content";

const PERMISSIONS = MODULE_PERMISSIONS.notices;
const ENTITY_TYPE = "Notice";

const noticeSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  body: z.string().trim().min(1, "Body is required").max(10000),
  category: z.string().trim().max(100).optional(),
  publishDate: optionalDateField,
  expiryDate: optionalDateField,
});

export type NoticeFormState = { error: string | null };

function parseForm(formData: FormData) {
  return noticeSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    category: formData.get("category") || undefined,
    publishDate: formData.get("publishDate") || undefined,
    expiryDate: formData.get("expiryDate") || undefined,
  });
}

export async function createNotice(
  _prevState: NoticeFormState,
  formData: FormData,
): Promise<NoticeFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { error: "No college record exists yet — cannot create content." };
  }

  const notice = await prisma.notice.create({
    data: {
      collegeId: college.id,
      title: parsed.data.title,
      body: parsed.data.body,
      category: parsed.data.category || null,
      publishDate: parsed.data.publishDate ?? null,
      expiryDate: parsed.data.expiryDate ?? null,
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
    entityId: notice.id,
    after: notice,
  });

  redirect(`/admin/notices/${notice.id}`);
}

export async function updateNotice(
  id: string,
  _prevState: NoticeFormState,
  formData: FormData,
): Promise<NoticeFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.notice.findUnique({ where: { id } });
  if (!before) {
    return { error: "Notice not found." };
  }

  const after = await prisma.notice.update({
    where: { id },
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      category: parsed.data.category || null,
      publishDate: parsed.data.publishDate ?? null,
      expiryDate: parsed.data.expiryDate ?? null,
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

  redirect(`/admin/notices/${id}`);
}

export async function transitionNotice(
  id: string,
  action: WorkflowActionName,
  _formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    action === "submit_for_review" ? PERMISSIONS.manage : PERMISSIONS.publish,
  );

  const notice = await prisma.notice.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: notice.status,
      action,
      actorId: user.id,
      update: (data) => prisma.notice.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
  }

  redirect(`/admin/notices/${id}`);
}
