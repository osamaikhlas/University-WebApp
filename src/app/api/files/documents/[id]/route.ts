import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { isDocumentPubliclyVisible } from "@/lib/content";
import { readUploadedFile } from "@/lib/security/upload-storage";

export const dynamic = "force-dynamic";

/**
 * The only way a document's file bytes are ever served. A currently-public document (see
 * `isDocumentPubliclyVisible`) is served to anyone — this is the actual `/downloads` link
 * target. Anything else (draft, unapproved, expired, not-yet-live, or archived) requires
 * `content_general:view`, so a guessed/bookmarked/shared link to a not-yet-public file can
 * never leak it (CLAUDE.md rules 4, 5). This is the one deliberate exception to "documents
 * need permission checks" grievance-style gating — a document's whole purpose, once
 * published, is to be publicly downloadable.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document || !document.storedPath) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  if (!isDocumentPubliclyVisible(document)) {
    await requirePermission(MODULE_PERMISSIONS.documents.view);
  }

  const bytes = await readUploadedFile(document.storedPath);
  const fileName = document.fileName || document.title;

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": document.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      "Content-Length": String(document.sizeBytes ?? bytes.byteLength),
      "Cache-Control": isDocumentPubliclyVisible(document)
        ? "public, max-age=300"
        : "private, no-store",
    },
  });
}
