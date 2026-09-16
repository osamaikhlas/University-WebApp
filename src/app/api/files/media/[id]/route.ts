import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import type { Permission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { readUploadedFile } from "@/lib/security/upload-storage";

export const dynamic = "force-dynamic";

/**
 * The only way a media asset's image bytes are ever served. `Media` itself carries no status
 * — visibility is derived from what it's attached to:
 *  - Wrapped in a `GalleryAlbum`/`GalleryItem`: public once at least one wrapping GalleryItem
 *    is PUBLISHED (an asset can appear in several album contexts; it's public as soon as any
 *    one of them is).
 *  - Attached to a `CollegeProfile` (principal's photo, `entityType: "CollegeProfile"`):
 *    public once that profile's own workflow status is PUBLISHED — the same publish gate as
 *    the profile content it illustrates (CLAUDE.md rules 4, 7).
 *  - Attached to the `College` record itself (site logo, `entityType: "College"`): public once
 *    that college is real, non-placeholder data (CLAUDE.md rule 14) — `College` has no
 *    separate content workflow of its own.
 * Anything else requires the matching module's `:view` permission (CLAUDE.md rules 4, 5) —
 * draft/under-review assets, or ones removed from every album, stay private.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const media = await prisma.media.findUnique({ where: { id } });
  if (!media || !media.storedPath) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  const { isPublic, viewPermission } = await resolveMediaVisibility(media);

  if (!isPublic) {
    await requirePermission(viewPermission);
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

async function resolveMediaVisibility(media: {
  id: string;
  entityType: string | null;
  entityId: string | null;
}): Promise<{ isPublic: boolean; viewPermission: Permission }> {
  if (media.entityType === "CollegeProfile" && media.entityId) {
    const profile = await prisma.collegeProfile.findUnique({
      where: { id: media.entityId },
      select: { status: true },
    });
    return {
      isPublic: profile?.status === "PUBLISHED",
      viewPermission: MODULE_PERMISSIONS.collegeProfile.view,
    };
  }

  if (media.entityType === "College" && media.entityId) {
    const college = await prisma.college.findUnique({
      where: { id: media.entityId },
      select: { isPlaceholder: true },
    });
    return {
      isPublic: college !== null && !college.isPlaceholder,
      viewPermission: MODULE_PERMISSIONS.collegeProfile.view,
    };
  }

  const publishedItem = await prisma.galleryItem.findFirst({
    where: { mediaId: media.id, status: "PUBLISHED" },
    select: { id: true },
  });
  return { isPublic: publishedItem !== null, viewPermission: MODULE_PERMISSIONS.gallery.view };
}
