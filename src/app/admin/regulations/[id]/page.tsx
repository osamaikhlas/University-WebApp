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
import { transitionRegulation } from "@/app/admin/regulations/actions";

export const metadata: Metadata = { title: "Regulation" };

export default async function RegulationViewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(MODULE_PERMISSIONS.regulations.view);
  const { id } = await params;

  const regulation = await prisma.regulation.findUnique({ where: { id } });
  if (!regulation) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.regulations.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.regulations.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={regulation.title} description="Regulation" />
          <div className="flex items-center gap-2">
            <StatusBadge status={regulation.status} />
            {canManage ? (
              <LinkButton href={`/admin/regulations/${regulation.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {regulation.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Category</dt>
              <dd className="mt-1">{regulation.category ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Regulating body</dt>
              <dd className="mt-1">{regulation.regulatingBody ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Body</dt>
              <dd className="mt-1 whitespace-pre-wrap">{regulation.body ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <WorkflowActions
          entityId={regulation.id}
          status={regulation.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionRegulation}
        />

        <Link href="/admin/regulations" className="text-sm text-brand hover:underline">
          ← Back to regulations
        </Link>
      </div>
    </Container>
  );
}
