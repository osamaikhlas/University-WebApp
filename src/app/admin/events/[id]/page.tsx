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
import { transitionEvent } from "@/app/admin/events/actions";

export const metadata: Metadata = { title: "Event" };

export default async function EventViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workflowError?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.events.view);
  const { id } = await params;
  const { workflowError } = await searchParams;

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.events.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.events.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={event.title} description="Event" />
          <div className="flex items-center gap-2">
            <StatusBadge status={event.status} />
            {canManage ? (
              <LinkButton href={`/admin/events/${event.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {event.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap">{event.description ?? "—"}</dd>
            </div>
            <div className="grid gap-x-4 sm:grid-flow-col sm:grid-rows-2 sm:grid-cols-3">
              <dt className="font-medium text-foreground/70">Start date</dt>
              <dd className="mt-1">{event.startDate.toLocaleDateString()}</dd>
              <dt className="font-medium text-foreground/70">End date</dt>
              <dd className="mt-1">{event.endDate?.toLocaleDateString() ?? "—"}</dd>
              <dt className="font-medium text-foreground/70">Location</dt>
              <dd className="mt-1">{event.location ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <WorkflowActions
                    entityType="Event"
          entityId={event.id}
          status={event.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionEvent}
          workflowError={workflowError}
        />

        <Link href="/admin/events" className="text-sm text-brand hover:underline">
          ← Back to events
        </Link>
      </div>
    </Container>
  );
}
