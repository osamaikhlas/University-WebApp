import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { hasPermission } from "@/lib/auth/permissions";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { isDocumentPubliclyVisible } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/Button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { WorkflowActions } from "@/components/admin/WorkflowActions";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { transitionDocument } from "@/app/admin/documents/actions";

export const metadata: Metadata = { title: "Document" };

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workflowError?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.documents.view);
  const { id } = await params;
  const { workflowError } = await searchParams;

  const document = await prisma.document.findUnique({
    where: { id },
    include: { approvedBy: { select: { name: true } }, uploadedBy: { select: { name: true } } },
  });
  if (!document) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.documents.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.documents.publish);
  const fileHref = `/api/files/documents/${document.id}`;
  const isImage = document.mimeType?.startsWith("image/");
  const isPdf = document.mimeType === "application/pdf";

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={document.title} description="Document" />
          <div className="flex items-center gap-2">
            <StatusBadge status={document.status} />
            {canManage ? (
              <LinkButton href={`/admin/documents/${document.id}/edit`} variant="secondary">
                Edit / replace file
              </LinkButton>
            ) : null}
          </div>
        </div>

        {document.isPlaceholder ? <DemoDataNotice /> : null}

        {document.status === "PUBLISHED" && !isDocumentPubliclyVisible(document) ? (
          <Alert tone="warning" title="Not currently visible to the public">
            Its status is Published, but its publish/expiry date window means it isn&apos;t
            live on the public Downloads page right now.
          </Alert>
        ) : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap">{document.description ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Category</dt>
              <dd className="mt-1">{document.category ?? "—"}</dd>
            </div>

            <div>
              <dt className="font-medium text-foreground/70">File</dt>
              <dd className="mt-1">
                {document.storedPath ? (
                  <div className="flex items-start gap-3">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element -- served from our own permission-checked API route, not a static/remote asset
                      <img
                        src={fileHref}
                        alt={`Preview of ${document.title}`}
                        className="h-24 w-24 rounded border border-border-subtle object-cover"
                      />
                    ) : isPdf ? (
                      <iframe
                        src={fileHref}
                        title={`Preview of ${document.title}`}
                        className="h-40 w-full max-w-md rounded border border-border-subtle"
                      />
                    ) : (
                      <span aria-hidden className="text-3xl">
                        📄
                      </span>
                    )}
                    <div>
                      <a href={fileHref} className="font-medium text-brand hover:underline">
                        {document.fileName ?? "Download"}
                      </a>
                      <p className="mt-1 text-xs text-foreground/60">
                        {document.mimeType ?? "Unknown type"} · {formatSize(document.sizeBytes)} ·
                        version {document.version}
                      </p>
                    </div>
                  </div>
                ) : (
                  <span className="text-foreground/60">No file uploaded yet.</span>
                )}
              </dd>
            </div>

            <div className="grid gap-x-4 sm:grid-flow-col sm:grid-rows-2 sm:grid-cols-2">
              <dt className="font-medium text-foreground/70">Publish date</dt>
              <dd className="mt-1">
                {document.publishDate ? document.publishDate.toLocaleDateString() : "Immediate"}
              </dd>
              <dt className="font-medium text-foreground/70">Expiry date</dt>
              <dd className="mt-1">
                {document.expiryDate ? document.expiryDate.toLocaleDateString() : "None"}
              </dd>
            </div>

            <div className="grid gap-x-4 sm:grid-flow-col sm:grid-rows-2 sm:grid-cols-2">
              <dt className="font-medium text-foreground/70">Uploader</dt>
              <dd className="mt-1">
                {document.uploadedBy.name} · {document.uploadedAt.toLocaleString()}
              </dd>
              <dt className="font-medium text-foreground/70">Approver</dt>
              <dd className="mt-1">
                {document.approvedBy
                  ? `${document.approvedBy.name} · ${document.approvedAt?.toLocaleString()}`
                  : "Not yet approved"}
              </dd>
            </div>
          </dl>
        </Card>

        <WorkflowActions
                    entityType="Document"
          entityId={document.id}
          status={document.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionDocument}
          workflowError={workflowError}
        />

        <Link href="/admin/documents" className="text-sm text-brand hover:underline">
          ← Back to documents
        </Link>
      </div>
    </Container>
  );
}
