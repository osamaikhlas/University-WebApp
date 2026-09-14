import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { hasPermission } from "@/lib/auth/permissions";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/Table";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { WorkflowActions } from "@/components/admin/WorkflowActions";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { transitionAlbum } from "@/app/admin/gallery/actions";

export const metadata: Metadata = { title: "Gallery album" };

export default async function AlbumViewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(MODULE_PERMISSIONS.gallery.view);
  const { id } = await params;

  const album = await prisma.galleryAlbum.findUnique({
    where: { id },
    include: { items: { include: { media: true }, orderBy: { order: "asc" } } },
  });
  if (!album) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.gallery.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.gallery.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={album.title} description="Gallery album" />
          <div className="flex items-center gap-2">
            <StatusBadge status={album.status} />
            {canManage ? (
              <LinkButton href={`/admin/gallery/${album.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {album.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Category</dt>
              <dd className="mt-1">{album.category ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap">{album.description ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <WorkflowActions
          entityId={album.id}
          status={album.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionAlbum}
        />

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-foreground">Items</h2>
            {canManage ? (
              <LinkButton href={`/admin/gallery/${album.id}/items/new`}>Add item</LinkButton>
            ) : null}
          </div>

          <DataTable
            caption="Album items"
            rows={album.items}
            getRowKey={(row) => row.id}
            emptyState={{
              title: "No items in this album yet.",
              description: canManage ? "Add the first one to get started." : undefined,
            }}
            columns={[
              {
                key: "caption",
                header: "Caption",
                render: (row) => (
                  <Link
                    href={`/admin/gallery/${album.id}/items/${row.id}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {row.caption || row.media.altText}
                  </Link>
                ),
              },
              { key: "mediaType", header: "Type", render: (row) => row.media.mediaType },
              { key: "order", header: "Order", render: (row) => row.order },
              { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
            ]}
          />
        </div>

        <Link href="/admin/gallery" className="text-sm text-brand hover:underline">
          ← Back to gallery
        </Link>
      </div>
    </Container>
  );
}
