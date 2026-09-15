import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { matchesDeclaredType } from "@/lib/security/file-signature";

/**
 * Storage for public grievance-submission attachments. Kept entirely outside `public/` — the
 * only way to read a file back is `readGrievanceAttachment`, called exclusively from the
 * authenticated, permission-checked download route
 * (src/app/api/admin/grievances/[id]/attachments/[attachmentId]/route.ts), never from a public
 * URL (CLAUDE.md rule 6). This project has no cloud object storage configured (see
 * `docs/architecture.md`'s known gaps), so local disk is the real, working implementation for
 * the environment this app actually runs in — the same constraint every other module's
 * `Document.fileUrl` already lives with.
 */
const STORAGE_ROOT = path.join(process.cwd(), "storage", "grievance-attachments");

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

  const directory = path.join(STORAGE_ROOT, grievanceId);
  await mkdir(directory, { recursive: true });

  const storedName = `${randomUUID()}-${sanitizeFileName(file.name)}`;
  await writeFile(path.join(directory, storedName), buffer);

  return {
    fileName: file.name || storedName,
    storedPath: path.join(grievanceId, storedName),
    mimeType: file.type || null,
    sizeBytes: file.size,
  };
}

/** Reads a previously stored attachment back by its DB-recorded relative path. `storedPath`
 * always originates from `GrievanceAttachment.storedPath` (never raw user input at read time),
 * but the containment check stays as defense in depth. */
export async function readGrievanceAttachment(storedPath: string): Promise<Buffer> {
  const absolutePath = path.resolve(STORAGE_ROOT, storedPath);
  if (!absolutePath.startsWith(STORAGE_ROOT + path.sep)) {
    throw new Error("Invalid attachment path.");
  }
  return readFile(absolutePath);
}
