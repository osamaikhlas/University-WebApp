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
import { optionalDateField } from "@/lib/admin/zod-helpers";
import { saveUploadedFile, validateUpload, UploadValidationError } from "@/lib/security/upload-storage";

const PERMISSIONS = MODULE_PERMISSIONS.gallery;
const ALBUM_ENTITY_TYPE = "GalleryAlbum";
const ITEM_ENTITY_TYPE = "GalleryItem";

const albumSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z.string().trim().max(4000).optional(),
  category: z.string().trim().max(200).optional(),
});

export type AlbumFormState = { error: string | null };

function parseAlbumForm(formData: FormData) {
  return albumSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    category: formData.get("category") || undefined,
  });
}

export async function createAlbum(
  _prevState: AlbumFormState,
  formData: FormData,
): Promise<AlbumFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseAlbumForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { error: "No college record exists yet — cannot create content." };
  }

  const album = await prisma.galleryAlbum.create({
    data: {
      collegeId: college.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category || null,
      status: "DRAFT",
      isPlaceholder: false,
      createdBy: user.id,
      updatedBy: user.id,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "CREATE",
    entityType: ALBUM_ENTITY_TYPE,
    entityId: album.id,
    after: album,
  });

  redirect(`/admin/gallery/${album.id}`);
}

export async function updateAlbum(
  id: string,
  _prevState: AlbumFormState,
  formData: FormData,
): Promise<AlbumFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseAlbumForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.galleryAlbum.findUnique({ where: { id } });
  if (!before) {
    return { error: "Album not found." };
  }

  const after = await prisma.galleryAlbum.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category || null,
      updatedBy: user.id,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entityType: ALBUM_ENTITY_TYPE,
    entityId: id,
    before,
    after,
  });

  redirect(`/admin/gallery/${id}`);
}

export async function transitionAlbum(
  id: string,
  action: WorkflowActionName,
  formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    MANAGE_PERMISSION_ACTIONS.has(action) ? PERMISSIONS.manage : PERMISSIONS.publish,
  );
  const comment = formData.get("comment")?.toString();

  const album = await prisma.galleryAlbum.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ALBUM_ENTITY_TYPE,
      entityId: id,
      currentStatus: album.status,
      action,
      actorId: user.id,
      comment,
      update: (data) => prisma.galleryAlbum.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    redirect(`/admin/gallery/${id}?workflowError=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/gallery/${id}`);
}

// --- Gallery items (each wraps a freshly-created Media asset) -------------------------------

const itemSchema = z.object({
  altText: z.string().trim().min(1, "Alt text is required for accessibility").max(500),
  caption: z.string().trim().max(500).optional(),
  category: z.string().trim().max(200).optional(),
  mediaDate: optionalDateField,
  order: z.coerce.number().int().min(0, "Must be zero or greater").optional(),
});

export type ItemFormState = { error: string | null };

function parseItemForm(formData: FormData) {
  return itemSchema.safeParse({
    altText: formData.get("altText"),
    caption: formData.get("caption") || undefined,
    category: formData.get("category") || undefined,
    mediaDate: formData.get("mediaDate") || undefined,
    order: formData.get("order") || undefined,
  });
}

export async function createItem(
  albumId: string,
  _prevState: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseItemForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return { error: "Select an image to upload." };
  }
  try {
    validateUpload("media", image);
  } catch (error) {
    if (!(error instanceof UploadValidationError)) throw error;
    return { error: error.message };
  }

  const album = await prisma.galleryAlbum.findUnique({ where: { id: albumId } });
  if (!album) {
    return { error: "Album not found." };
  }

  const media = await prisma.media.create({
    data: {
      collegeId: album.collegeId,
      entityType: ALBUM_ENTITY_TYPE,
      entityId: album.id,
      altText: parsed.data.altText,
      category: parsed.data.category || null,
      mediaDate: parsed.data.mediaDate ?? null,
      mediaType: "IMAGE",
      uploadedById: user.id,
      isPlaceholder: false,
    },
  });

  const stored = await saveUploadedFile("media", media.id, image);
  await prisma.media.update({
    where: { id: media.id },
    data: { storedPath: stored.storedPath, mimeType: stored.mimeType },
  });

  const item = await prisma.galleryItem.create({
    data: {
      collegeId: album.collegeId,
      albumId: album.id,
      mediaId: media.id,
      caption: parsed.data.caption || null,
      order: parsed.data.order ?? 0,
      status: "DRAFT",
      isPlaceholder: false,
      createdBy: user.id,
      updatedBy: user.id,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "CREATE",
    entityType: ITEM_ENTITY_TYPE,
    entityId: item.id,
    after: item,
  });

  redirect(`/admin/gallery/${albumId}/items/${item.id}`);
}

export async function updateItem(
  albumId: string,
  itemId: string,
  _prevState: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseItemForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.galleryItem.findUnique({ where: { id: itemId } });
  if (!before) {
    return { error: "Item not found." };
  }

  // Replacing the image is optional on the edit form — leave it blank to change only
  // metadata (caption/category/date/alt text), consistent with Documents' edit-form
  // replacement pattern.
  const image = formData.get("image");
  let mediaFileUpdate: { storedPath: string; mimeType: string } | null = null;
  if (image instanceof File && image.size > 0) {
    try {
      validateUpload("media", image);
    } catch (error) {
      if (!(error instanceof UploadValidationError)) throw error;
      return { error: error.message };
    }
    const stored = await saveUploadedFile("media", before.mediaId, image);
    mediaFileUpdate = { storedPath: stored.storedPath, mimeType: stored.mimeType };
  }

  await prisma.media.update({
    where: { id: before.mediaId },
    data: {
      altText: parsed.data.altText,
      category: parsed.data.category || null,
      mediaDate: parsed.data.mediaDate ?? null,
      ...(mediaFileUpdate ?? {}),
    },
  });

  const after = await prisma.galleryItem.update({
    where: { id: itemId },
    data: {
      caption: parsed.data.caption || null,
      order: parsed.data.order ?? 0,
      updatedBy: user.id,
    },
  });

  await logAudit({
    actorId: user.id,
    action: mediaFileUpdate ? "FILE_REPLACED" : "UPDATE",
    entityType: ITEM_ENTITY_TYPE,
    entityId: itemId,
    before,
    after,
  });

  redirect(`/admin/gallery/${albumId}/items/${itemId}`);
}

export async function transitionItem(
  albumId: string,
  itemId: string,
  action: WorkflowActionName,
  formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    MANAGE_PERMISSION_ACTIONS.has(action) ? PERMISSIONS.manage : PERMISSIONS.publish,
  );
  const comment = formData.get("comment")?.toString();

  const item = await prisma.galleryItem.findUniqueOrThrow({ where: { id: itemId } });

  try {
    await applyWorkflowTransition({
      entityType: ITEM_ENTITY_TYPE,
      entityId: itemId,
      currentStatus: item.status,
      action,
      actorId: user.id,
      comment,
      update: (data) => prisma.galleryItem.update({ where: { id: itemId }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    redirect(
      `/admin/gallery/${albumId}/items/${itemId}?workflowError=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(`/admin/gallery/${albumId}/items/${itemId}`);
}
