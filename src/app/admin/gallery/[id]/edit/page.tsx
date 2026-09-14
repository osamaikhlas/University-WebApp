import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { AlbumForm } from "@/app/admin/gallery/AlbumForm";

export const metadata: Metadata = { title: "Edit album" };

export default async function EditAlbumPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(MODULE_PERMISSIONS.gallery.manage);
  const { id } = await params;

  const album = await prisma.galleryAlbum.findUnique({ where: { id } });
  if (!album) notFound();

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${album.title}`} description="Gallery album" />
        <Card>
          <AlbumForm mode="edit" album={album} />
        </Card>
      </div>
    </Container>
  );
}
