import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { AlbumForm } from "@/app/admin/gallery/AlbumForm";

export const metadata: Metadata = { title: "New album" };

export default async function NewAlbumPage() {
  await requirePermission(MODULE_PERMISSIONS.gallery.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New album" description="It starts as a draft." />
        <Card>
          <AlbumForm mode="create" />
        </Card>
      </div>
    </Container>
  );
}
