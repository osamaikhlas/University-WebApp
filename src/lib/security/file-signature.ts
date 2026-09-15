import "server-only";

/**
 * Verifies that a file's actual bytes are consistent with its claimed MIME type, rather than
 * trusting `File.type` alone. `File.type` on a browser-originated upload is usually derived
 * from the file's extension, but nothing stops a scripted client from constructing a
 * multipart request with any `Content-Type` it likes for a part — so relying on it alone lets
 * an attacker upload arbitrary bytes (e.g. HTML containing `<script>`) under an allow-listed
 * MIME type like `image/png`. Combined with an inline-serving route (the public Gallery/Media
 * endpoint), that's a stored-XSS path if a browser ever content-sniffs the response instead of
 * trusting the declared `Content-Type` header. This is deliberately a second, independent
 * layer alongside `X-Content-Type-Options: nosniff` (see next.config.ts) and
 * `Content-Disposition: attachment` on document/attachment downloads, not a replacement for
 * either — defense in depth, since any one layer alone could be misconfigured or unsupported
 * by some client.
 *
 * Only checks types this app's upload allow-lists (`upload-storage.ts`, `file-storage.ts`)
 * actually accept. Returns `true` (no objection) for anything not in the table below —
 * `text/plain` has no reliable byte signature, and any MIME type reaching this function that
 * isn't in the table is a bug in the caller's own allow-list, not something this function
 * should silently start blocking.
 */
function bytesStartWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

function asciiAt(bytes: Uint8Array, offset: number, text: string): boolean {
  if (bytes.length < offset + text.length) return false;
  for (let i = 0; i < text.length; i++) {
    if (bytes[offset + i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

// The legacy OLE2/Compound File Binary signature shared by the pre-2007 Office formats
// (.doc/.xls/.ppt) — they aren't distinguishable from their magic bytes alone, only from
// .docx/.xlsx/.pptx (a completely different, ZIP-based container).
const OLE2_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
// A ZIP local-file-header signature — every OOXML (.docx/.xlsx/.pptx) file is a ZIP archive.
const ZIP_SIGNATURES = [
  [0x50, 0x4b, 0x03, 0x04],
  [0x50, 0x4b, 0x05, 0x06], // empty archive
  [0x50, 0x4b, 0x07, 0x08], // spanned archive
];

export function matchesDeclaredType(mimeType: string, bytes: Uint8Array): boolean {
  switch (mimeType) {
    case "application/pdf":
      return asciiAt(bytes, 0, "%PDF-");
    case "image/jpeg":
      return bytesStartWith(bytes, [0xff, 0xd8, 0xff]);
    case "image/png":
      return bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/gif":
      return asciiAt(bytes, 0, "GIF87a") || asciiAt(bytes, 0, "GIF89a");
    case "image/webp":
      return asciiAt(bytes, 0, "RIFF") && asciiAt(bytes, 8, "WEBP");
    case "application/msword":
    case "application/vnd.ms-excel":
    case "application/vnd.ms-powerpoint":
      return bytesStartWith(bytes, OLE2_SIGNATURE);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return ZIP_SIGNATURES.some((signature) => bytesStartWith(bytes, signature));
    case "text/plain":
      return true;
    default:
      return true;
  }
}
