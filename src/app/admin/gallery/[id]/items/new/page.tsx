import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { ItemForm } from "@/app/admin/gallery/ItemForm";

export const metadata: Metadata = { title: "Add gallery item" };

export default async function NewItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(MODULE_PERMISSIONS.gallery.manage);
  const { id } = await params;

  const album = await prisma.galleryAlbum.findUnique({ where: { id } });
  if (!album) notFound();

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Add item to ${album.title}`} description="It starts as a draft." />
        <Card>
          <ItemForm mode="create" albumId={album.id} />
        </Card>
      </div>
    </Container>
  );
}
