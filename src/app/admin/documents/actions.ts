"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import {
  applyWorkflowTransition,
  WorkflowError,
  WORKFLOW_TRANSITIONS,
  MANAGE_PERMISSION_ACTIONS,
  type WorkflowActionName,
} from "@/lib/content-workflow";
import { optionalDateField } from "@/lib/admin/zod-helpers";
import { logAudit } from "@/lib/audit";
import { getPrimaryCollege } from "@/lib/content";
import { saveUploadedFile, validateUpload, UploadValidationError } from "@/lib/security/upload-storage";

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

const documentSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(300),
    description: z.string().trim().max(4000).optional(),
    category: z.string().trim().max(200).optional(),
    publishDate: optionalDateField,
    expiryDate: optionalDateField,
  })
  .refine((data) => !data.publishDate || !data.expiryDate || data.publishDate <= data.expiryDate, {
    message: "Expiry date must be on or after the publish date.",
    path: ["expiryDate"],
  });

export type DocumentFormState = { error: string | null };

function parseForm(formData: FormData) {
  return documentSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    category: formData.get("category") || undefined,
    publishDate: formData.get("publishDate") || undefined,
    expiryDate: formData.get("expiryDate") || undefined,
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

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Select a file to upload." };
  }
  try {
    validateUpload("document", file);
  } catch (error) {
    if (!(error instanceof UploadValidationError)) throw error;
    return { error: error.message };
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
      description: parsed.data.description || null,
      category: parsed.data.category || null,
      publishDate: parsed.data.publishDate ?? null,
      expiryDate: parsed.data.expiryDate ?? null,
      uploadedById: user.id,
      status: "DRAFT",
      isPlaceholder: false,
      updatedBy: user.id,
    },
  });

  const stored = await saveUploadedFile("document", document.id, file);
  const after = await prisma.document.update({
    where: { id: document.id },
    data: {
      storedPath: stored.storedPath,
      fileName: stored.fileName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "CREATE",
    entityType: ENTITY_TYPE,
    entityId: document.id,
    after,
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

  // Replacing the file is optional on the edit form — leave it blank to change only metadata
  // (CLAUDE.md-style "implement replacement" without forcing a separate page for it).
  const file = formData.get("file");
  let fileUpdate: {
    storedPath: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    version: { increment: number };
  } | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      validateUpload("document", file);
    } catch (error) {
      if (!(error instanceof UploadValidationError)) throw error;
      return { error: error.message };
    }
    const stored = await saveUploadedFile("document", id, file);
    fileUpdate = {
      storedPath: stored.storedPath,
      fileName: stored.fileName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      version: { increment: 1 },
    };
  }

  const after = await prisma.document.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category || null,
      publishDate: parsed.data.publishDate ?? null,
      expiryDate: parsed.data.expiryDate ?? null,
      updatedBy: user.id,
      ...(fileUpdate ?? {}),
    },
  });

  await logAudit({
    actorId: user.id,
    action: fileUpdate ? "FILE_REPLACED" : "UPDATE",
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

  if (action === "publish" && !document.storedPath) {
    redirect(
      `/admin/documents/${id}?workflowError=${encodeURIComponent("Upload a file before publishing.")}`,
    );
  }

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

  // "Approver" tracking (prisma/schema.prisma's Document.approvedById/approvedAt comment) is
  // specific to this module, so it's a small follow-up mutation here rather than a generic
  // field on every module's shared workflow engine.
  if (action === "approve") {
    await prisma.document.update({
      where: { id },
      data: { approvedById: user.id, approvedAt: new Date() },
    });
  } else if (WORKFLOW_TRANSITIONS[action].to === "DRAFT") {
    await prisma.document.update({
      where: { id },
      data: { approvedById: null, approvedAt: null },
    });
  }

  redirect(`/admin/documents/${id}`);
}
