import "server-only";

import { randomUUID } from "node:crypto";
import path from "node:path";
import { matchesDeclaredType } from "@/lib/security/file-signature";
import { readObject, writeObject } from "@/lib/security/object-storage";

/**
 * Storage for real uploaded Document/Media files (as distinct from
 * src/lib/security/file-storage.ts, which is specifically for private grievance attachments
 * with their own validation rules and is never publicly reachable). Documents and Media are
 * different: once PUBLISHED, their files must become genuinely public, but before that (or
 * once archived/expired) they must not be — see src/app/api/files/[kind]/[id]/route.ts, the
 * only place these bytes are ever read back.
 *
 * Kept entirely outside `public/` regardless of eventual visibility, so "is this file
 * reachable" is always a single, auditable decision made in the serving route, never an
 * accident of static file serving. Actual bytes live in object-storage.ts's backend (local
 * disk in dev, S3-compatible in production — see that module) under an "uploads/" prefix, so
 * `storedPath` here is unchanged from before that module existed.
 */
export type UploadKind = "document" | "media";

type KindConfig = { maxBytes: number; allowedTypes: ReadonlySet<string> };

const KIND_CONFIG: Record<UploadKind, KindConfig> = {
  document: {
    maxBytes: 25 * 1024 * 1024, // 25MB — official documents (prospectuses, circulars) run larger than a grievance attachment.
    allowedTypes: new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "image/jpeg",
      "image/png",
    ]),
  },
  media: {
    maxBytes: 10 * 1024 * 1024, // 10MB — gallery photos.
    allowedTypes: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  },
};

export class UploadValidationError extends Error {}

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-150);
  return cleaned || "upload";
}

export function isAllowedUploadType(kind: UploadKind, mimeType: string): boolean {
  return KIND_CONFIG[kind].allowedTypes.has(mimeType);
}

export function maxUploadBytes(kind: UploadKind): number {
  return KIND_CONFIG[kind].maxBytes;
}

export type StoredUpload = {
  fileName: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
};

/** Checks size/type constraints without touching disk — callers use this to validate a
 * submitted file *before* creating (or updating) the owning database row, so a rejected
 * upload never leaves behind an orphaned record. Throws {@link UploadValidationError} with a
 * user-facing message safe to show directly on the form. `saveUploadedFile` calls this too,
 * so it's always enforced even if a caller skips the early check. */
export function validateUpload(kind: UploadKind, file: File): void {
  const config = KIND_CONFIG[kind];

  if (file.size === 0) {
    throw new UploadValidationError("The selected file is empty.");
  }
  if (file.size > config.maxBytes) {
    throw new UploadValidationError(
      `The file must be ${Math.floor(config.maxBytes / (1024 * 1024))}MB or smaller.`,
    );
  }
  if (!file.type || !config.allowedTypes.has(file.type)) {
    throw new UploadValidationError(
      kind === "document"
        ? "Unsupported file type. Allowed: PDF, DOC(X), XLS(X), PPT(X), TXT, JPEG, PNG."
        : "Unsupported file type. Allowed: JPEG, PNG, WEBP, GIF.",
    );
  }
}

/** Validates and persists an uploaded file for `kind` under `entityId` (the owning
 * Document/Media row's id). */
export async function saveUploadedFile(
  kind: UploadKind,
  entityId: string,
  file: File,
): Promise<StoredUpload> {
  validateUpload(kind, file);

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesDeclaredType(file.type, buffer)) {
    throw new UploadValidationError(
      "The file's contents don't match its declared type. Choose a genuine file of the allowed type.",
    );
  }

  const storedName = `${randomUUID()}-${sanitizeFileName(file.name)}`;
  const storedPath = path.join(kind, entityId, storedName);
  await writeObject(path.join("uploads", storedPath), buffer);

  return {
    fileName: file.name || storedName,
    storedPath,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

/** Reads a previously stored upload back by its DB-recorded relative path. `storedPath`
 * always originates from `Document.storedPath`/`Media.storedPath` (never raw user input at
 * read time) — object-storage.ts's own containment check still applies as defense in depth. */
export async function readUploadedFile(storedPath: string): Promise<Buffer> {
  return readObject(path.join("uploads", storedPath));
}
