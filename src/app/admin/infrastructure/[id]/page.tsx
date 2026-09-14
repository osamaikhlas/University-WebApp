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
import { transitionInfrastructure } from "@/app/admin/infrastructure/actions";

export const metadata: Metadata = { title: "Infrastructure item" };

export default async function InfrastructureViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workflowError?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.infrastructure.view);
  const { id } = await params;
  const { workflowError } = await searchParams;

  const infrastructure = await prisma.infrastructure.findUnique({ where: { id } });
  if (!infrastructure) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.infrastructure.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.infrastructure.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={infrastructure.name} description="Infrastructure item" />
          <div className="flex items-center gap-2">
            <StatusBadge status={infrastructure.status} />
            {canManage ? (
              <LinkButton
                href={`/admin/infrastructure/${infrastructure.id}/edit`}
                variant="secondary"
              >
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {infrastructure.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Category</dt>
              <dd className="mt-1">{infrastructure.category}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap">{infrastructure.description ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <WorkflowActions
          entityId={infrastructure.id}
          status={infrastructure.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionInfrastructure}
          workflowError={workflowError}
        />

        <Link href="/admin/infrastructure" className="text-sm text-brand hover:underline">
          ← Back to infrastructure
        </Link>
      </div>
    </Container>
  );
}
