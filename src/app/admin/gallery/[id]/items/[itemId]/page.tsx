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
import { StatusBadge } from "@/components/admin/StatusBadge";
import { WorkflowActions } from "@/components/admin/WorkflowActions";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { transitionItem } from "@/app/admin/gallery/actions";

export const metadata: Metadata = { title: "Gallery item" };

export default async function ItemViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; itemId: string }>;
  searchParams: Promise<{ workflowError?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.gallery.view);
  const { id: albumId, itemId } = await params;
  const { workflowError } = await searchParams;

  const item = await prisma.galleryItem.findUnique({
    where: { id: itemId },
    include: { media: true, album: true },
  });
  if (!item || item.albumId !== albumId) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.gallery.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.gallery.publish);
  const transitionForItem = transitionItem.bind(null, albumId);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading
            title={item.caption || item.media.altText}
            description={`Item in ${item.album.title}`}
          />
          <div className="flex items-center gap-2">
            <StatusBadge status={item.status} />
            {canManage ? (
              <LinkButton
                href={`/admin/gallery/${albumId}/items/${item.id}/edit`}
                variant="secondary"
              >
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {item.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Image</dt>
              <dd className="mt-1">
                {item.media.storedPath ? (
                  // eslint-disable-next-line @next/next/no-img-element -- served from our own permission-checked API route, not a static/remote asset
                  <img
                    src={`/api/files/media/${item.media.id}`}
                    alt={item.media.altText}
                    className="h-40 w-40 rounded border border-border-subtle object-cover"
                  />
                ) : (
                  <span className="text-foreground/60">No image uploaded yet.</span>
                )}
              </dd>
            </div>
            <div className="grid gap-x-4 sm:grid-flow-col sm:grid-rows-2 sm:grid-cols-2">
              <dt className="font-medium text-foreground/70">Alt text</dt>
              <dd className="mt-1">{item.media.altText}</dd>
              <dt className="font-medium text-foreground/70">Category</dt>
              <dd className="mt-1">{item.media.category ?? "—"}</dd>
            </div>
            <div className="grid gap-x-4 sm:grid-flow-col sm:grid-rows-2 sm:grid-cols-2">
              <dt className="font-medium text-foreground/70">Date</dt>
              <dd className="mt-1">
                {item.media.mediaDate ? item.media.mediaDate.toLocaleDateString() : "—"}
              </dd>
              <dt className="font-medium text-foreground/70">Display order</dt>
              <dd className="mt-1">{item.order}</dd>
            </div>
          </dl>
        </Card>

        <WorkflowActions
                    entityType="GalleryItem"
          entityId={item.id}
          status={item.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionForItem}
          workflowError={workflowError}
        />

        <Link href={`/admin/gallery/${albumId}`} className="text-sm text-brand hover:underline">
          ← Back to {item.album.title}
        </Link>
      </div>
    </Container>
  );
}
