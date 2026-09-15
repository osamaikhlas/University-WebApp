import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { readUploadedFile } from "@/lib/security/upload-storage";

export const dynamic = "force-dynamic";

/**
 * The only way a media asset's image bytes are ever served. `Media` itself carries no status
 * — visibility is entirely governed by whether at least one `GalleryItem` currently wrapping
 * this asset is PUBLISHED (an asset can appear in several album contexts; it's public as soon
 * as any one of them is). Anything else requires `content_general:view` (CLAUDE.md rules 4,
 * 5) — draft/under-review photos, or ones only ever removed from every album, stay private.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const media = await prisma.media.findUnique({ where: { id } });
  if (!media || !media.storedPath) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  const publishedItem = await prisma.galleryItem.findFirst({
    where: { mediaId: id, status: "PUBLISHED" },
    select: { id: true },
  });
  const isPublic = publishedItem !== null;

  if (!isPublic) {
    await requirePermission(MODULE_PERMISSIONS.gallery.view);
  }

  const bytes = await readUploadedFile(media.storedPath);

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": media.mimeType || "application/octet-stream",
      "Content-Disposition": "inline",
      "Cache-Control": isPublic ? "public, max-age=300" : "private, no-store",
    },
  });
}
