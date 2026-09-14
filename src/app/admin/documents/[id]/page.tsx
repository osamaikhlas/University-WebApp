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
import { transitionDocument } from "@/app/admin/documents/actions";

export const metadata: Metadata = { title: "Document" };

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

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.documents.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.documents.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={document.title} description="Document" />
          <div className="flex items-center gap-2">
            <StatusBadge status={document.status} />
            {canManage ? (
              <LinkButton href={`/admin/documents/${document.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {document.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Category</dt>
              <dd className="mt-1">{document.category ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">File</dt>
              <dd className="mt-1">
                <a href={document.fileUrl} className="text-brand hover:underline">
                  {document.fileUrl}
                </a>
              </dd>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="font-medium text-foreground/70">File type</dt>
                <dd className="mt-1">{document.mimeType ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground/70">Size</dt>
                <dd className="mt-1">
                  {document.sizeBytes != null ? `${document.sizeBytes} bytes` : "—"}
                </dd>
              </div>
            </div>
          </dl>
        </Card>

        <WorkflowActions
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
