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
import { transitionActivity } from "@/app/admin/activities/actions";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityViewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(MODULE_PERMISSIONS.activities.view);
  const { id } = await params;

  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.activities.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.activities.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={activity.title} description="Activity" />
          <div className="flex items-center gap-2">
            <StatusBadge status={activity.status} />
            {canManage ? (
              <LinkButton href={`/admin/activities/${activity.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {activity.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Category</dt>
              <dd className="mt-1">{activity.category ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap">{activity.description ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <WorkflowActions
          entityId={activity.id}
          status={activity.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionActivity}
        />

        <Link href="/admin/activities" className="text-sm text-brand hover:underline">
          ← Back to activities
        </Link>
      </div>
    </Container>
  );
}
