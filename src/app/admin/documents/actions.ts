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

const PERMISSIONS = MODULE_PERMISSIONS.documents;
const ENTITY_TYPE = "Document";

/**
 * `Document` is normally a generic `(entityType, entityId)` attachment shared by many
 * modules (prisma/schema.prisma §15) — but this CMS module authors the public "Downloads"
 * page's general documents (circulars, forms, policies), which aren't attached to any more
 * specific record. `"College"` + the college id is the same "general, not tied to anything
 * more specific" sentinel `prisma/seed.ts` already uses for its example audit-log entry.
 */
const GENERAL_ENTITY_TYPE = "College";

const documentSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  category: z.string().trim().max(200).optional(),
  fileUrl: z.string().trim().min(1, "File URL is required").url("Enter a valid URL").max(1000),
  mimeType: z.string().trim().max(100).optional(),
  sizeBytes: z.coerce.number().int().min(0, "Must be zero or greater").optional(),
});

export type DocumentFormState = { error: string | null };

function parseForm(formData: FormData) {
  return documentSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category") || undefined,
    fileUrl: formData.get("fileUrl"),
    mimeType: formData.get("mimeType") || undefined,
    // `|| undefined` (not blank-string coercion) so a blank field is genuinely omitted
    // rather than silently becoming a real 0-byte size.
    sizeBytes: formData.get("sizeBytes") || undefined,
  });
}

export async function createDocument(
  _prevState: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { error: "No college record exists yet — cannot create content." };
  }

  const document = await prisma.document.create({
    data: {
      collegeId: college.id,
      entityType: GENERAL_ENTITY_TYPE,
      entityId: college.id,
      title: parsed.data.title,
      category: parsed.data.category || null,
      fileUrl: parsed.data.fileUrl,
      mimeType: parsed.data.mimeType || null,
      sizeBytes: parsed.data.sizeBytes ?? null,
      uploadedById: user.id,
      status: "DRAFT",
      isPlaceholder: false,
      updatedBy: user.id,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "CREATE",
    entityType: ENTITY_TYPE,
    entityId: document.id,
    after: document,
  });

  redirect(`/admin/documents/${document.id}`);
}

export async function updateDocument(
  id: string,
  _prevState: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.document.findUnique({ where: { id } });
  if (!before) {
    return { error: "Document not found." };
  }

  const after = await prisma.document.update({
    where: { id },
    data: {
      title: parsed.data.title,
      category: parsed.data.category || null,
      fileUrl: parsed.data.fileUrl,
      mimeType: parsed.data.mimeType || null,
      sizeBytes: parsed.data.sizeBytes ?? null,
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

  redirect(`/admin/documents/${id}`);
}

export async function transitionDocument(
  id: string,
  action: WorkflowActionName,
  formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    MANAGE_PERMISSION_ACTIONS.has(action) ? PERMISSIONS.manage : PERMISSIONS.publish,
  );
  const comment = formData.get("comment")?.toString();

  const document = await prisma.document.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: document.status,
      action,
      actorId: user.id,
      comment,
      update: (data) => prisma.document.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    redirect(`/admin/documents/${id}?workflowError=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/documents/${id}`);
}
