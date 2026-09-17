import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Generic object storage, shared by `upload-storage.ts` (Document/Media) and
 * `file-storage.ts` (grievance attachments) — both used to write straight to local disk,
 * which only works on a host with a real persistent, writable filesystem. This app deploys
 * to Vercel (serverless — no persistent filesystem), so production must configure the
 * `STORAGE_S3_*` env vars below; local development keeps writing to `storage/` on disk so
 * running this app doesn't require a cloud storage account.
 *
 * `key` is a relative path like `"media/<id>/<filename>"` — identical in shape to the local
 * relative path this app already stored in `storedPath` columns before this module existed,
 * so switching backends never requires migrating existing `storedPath` values.
 *
 * Any S3-compatible provider works (AWS S3, Cloudflare R2, Backblaze B2, DigitalOcean
 * Spaces, MinIO, ...) — set `STORAGE_S3_ENDPOINT` for anything that isn't real AWS S3.
 */

const S3_BUCKET = process.env.STORAGE_S3_BUCKET;
const S3_REGION = process.env.STORAGE_S3_REGION || "auto";
const S3_ENDPOINT = process.env.STORAGE_S3_ENDPOINT || undefined;
const S3_ACCESS_KEY_ID = process.env.STORAGE_S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.STORAGE_S3_SECRET_ACCESS_KEY;

const USE_S3 = Boolean(S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY);

export function isUsingCloudStorage(): boolean {
  return USE_S3;
}

let cachedClient: S3Client | null = null;
function getS3Client(): S3Client {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT,
      credentials: { accessKeyId: S3_ACCESS_KEY_ID!, secretAccessKey: S3_SECRET_ACCESS_KEY! },
    });
  }
  return cachedClient;
}

const LOCAL_STORAGE_ROOT = path.join(process.cwd(), "storage");

/**
 * Local disk is silently wrong in production (Vercel has no persistent/writable
 * filesystem), so this throws a loud, specific error the first time anything actually tries
 * to write/read a file there, rather than failing at build/module-load time — `next build`
 * runs with NODE_ENV=production and must never require these credentials just to compile
 * (see src/lib/env.ts's own comment on why this check doesn't live there instead).
 */
function assertStorageConfigured(): void {
  if (!USE_S3 && process.env.NODE_ENV === "production") {
    throw new Error(
      "STORAGE_S3_BUCKET/STORAGE_S3_ACCESS_KEY_ID/STORAGE_S3_SECRET_ACCESS_KEY are not set in " +
        "production — local disk storage does not persist on this host. See .env.example.",
    );
  }
}

function resolveLocalPath(key: string): string {
  const absolutePath = path.resolve(LOCAL_STORAGE_ROOT, key);
  // Defense in depth — every real caller already builds `key` from a DB-generated id or a
  // randomUUID-prefixed sanitized filename, never raw user input, but this keeps a path-
  // traversal attempt from ever escaping the storage root even if that ever changes.
  if (!absolutePath.startsWith(LOCAL_STORAGE_ROOT + path.sep)) {
    throw new Error("Invalid storage key.");
  }
  return absolutePath;
}

export async function writeObject(key: string, bytes: Buffer): Promise<void> {
  assertStorageConfigured();
  if (USE_S3) {
    await getS3Client().send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: bytes }));
    return;
  }
  const absolutePath = resolveLocalPath(key);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes);
}

export async function readObject(key: string): Promise<Buffer> {
  assertStorageConfigured();
  if (USE_S3) {
    const result = await getS3Client().send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    if (!result.Body) throw new Error(`Object not found: ${key}`);
    const byteArray = await result.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }
  return readFile(resolveLocalPath(key));
}
