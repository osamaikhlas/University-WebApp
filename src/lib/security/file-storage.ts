import "server-only";

import { randomUUID } from "node:crypto";
import path from "node:path";
import { matchesDeclaredType } from "@/lib/security/file-signature";
import { readObject, writeObject } from "@/lib/security/object-storage";

/**
 * Storage for public grievance-submission attachments. Kept entirely outside `public/` — the
 * only way to read a file back is `readGrievanceAttachment`, called exclusively from the
 * authenticated, permission-checked download route
 * (src/app/api/admin/grievances/[id]/attachments/[attachmentId]/route.ts), never from a public
 * URL (CLAUDE.md rule 6). Actual bytes live in object-storage.ts's backend (local disk in
 * dev, S3-compatible in production) under a "grievance-attachments/" prefix.
 */
const KEY_PREFIX = "grievance-attachments";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export class AttachmentValidationError extends Error {}

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-150);
  return cleaned || "attachment";
}

export function isAllowedAttachmentType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType);
}

export type StoredAttachment = {
  fileName: string;
  storedPath: string;
  mimeType: string | null;
  sizeBytes: number;
};

/** Validates and persists a public submitter's uploaded file. Throws
 * {@link AttachmentValidationError} (a user-facing message, safe to show on the form) for any
 * rejection — empty file, over the size cap, or an unsupported type (itself a basic abuse
 * guard against arbitrary-file storage exhaustion). */
export async function saveGrievanceAttachment(
  grievanceId: string,
  file: File,
): Promise<StoredAttachment> {
  if (file.size === 0) {
    throw new AttachmentValidationError("The attached file is empty.");
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new AttachmentValidationError("The attachment must be 10MB or smaller.");
  }
  if (file.type && !isAllowedAttachmentType(file.type)) {
    throw new AttachmentValidationError(
      "Unsupported attachment type. Allowed: PDF, JPEG, PNG, WEBP, DOC, DOCX.",
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (file.type && !matchesDeclaredType(file.type, buffer)) {
    throw new AttachmentValidationError(
      "The attached file's contents don't match its declared type. Choose a genuine file of the allowed type.",
    );
  }

  const storedName = `${randomUUID()}-${sanitizeFileName(file.name)}`;
  const storedPath = path.join(grievanceId, storedName);
  await writeObject(path.join(KEY_PREFIX, storedPath), buffer);

  return {
    fileName: file.name || storedName,
    storedPath,
    mimeType: file.type || null,
    sizeBytes: file.size,
  };
}

/** Reads a previously stored attachment back by its DB-recorded relative path. `storedPath`
 * always originates from `GrievanceAttachment.storedPath` (never raw user input at read
 * time) — object-storage.ts's own containment check still applies as defense in depth. */
export async function readGrievanceAttachment(storedPath: string): Promise<Buffer> {
  return readObject(path.join(KEY_PREFIX, storedPath));
}
