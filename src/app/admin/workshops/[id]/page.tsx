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
import { transitionWorkshop } from "@/app/admin/workshops/actions";

export const metadata: Metadata = { title: "Workshop" };

export default async function WorkshopViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workflowError?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.workshops.view);
  const { id } = await params;
  const { workflowError } = await searchParams;

  const workshop = await prisma.workshop.findUnique({
    where: { id },
    include: { department: true },
  });
  if (!workshop) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.workshops.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.workshops.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={workshop.title} description="Workshop" />
          <div className="flex items-center gap-2">
            <StatusBadge status={workshop.status} />
            {canManage ? (
              <LinkButton href={`/admin/workshops/${workshop.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {workshop.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Facilitator</dt>
              <dd className="mt-1">{workshop.facilitator ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Department</dt>
              <dd className="mt-1">{workshop.department?.name ?? "College-wide"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap">{workshop.description ?? "—"}</dd>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="font-medium text-foreground/70">Start date</dt>
                <dd className="mt-1">{workshop.startDate.toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground/70">End date</dt>
                <dd className="mt-1">{workshop.endDate?.toLocaleDateString() ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground/70">Venue</dt>
                <dd className="mt-1">{workshop.venue ?? "—"}</dd>
              </div>
            </div>
          </dl>
        </Card>

        <WorkflowActions
          entityId={workshop.id}
          status={workshop.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionWorkshop}
          workflowError={workflowError}
        />

        <Link href="/admin/workshops" className="text-sm text-brand hover:underline">
          ← Back to workshops
        </Link>
      </div>
    </Container>
  );
}
