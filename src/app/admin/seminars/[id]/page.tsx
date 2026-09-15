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
import { transitionSeminar } from "@/app/admin/seminars/actions";

export const metadata: Metadata = { title: "Seminar" };

export default async function SeminarViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workflowError?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.seminars.view);
  const { id } = await params;
  const { workflowError } = await searchParams;

  const seminar = await prisma.seminar.findUnique({ where: { id }, include: { department: true } });
  if (!seminar) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.seminars.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.seminars.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={seminar.title} description="Seminar" />
          <div className="flex items-center gap-2">
            <StatusBadge status={seminar.status} />
            {canManage ? (
              <LinkButton href={`/admin/seminars/${seminar.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {seminar.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Speaker</dt>
              <dd className="mt-1">{seminar.speaker ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Department</dt>
              <dd className="mt-1">{seminar.department?.name ?? "College-wide"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap">{seminar.description ?? "—"}</dd>
            </div>
            <div className="grid gap-x-4 sm:grid-flow-col sm:grid-rows-2 sm:grid-cols-3">
              <dt className="font-medium text-foreground/70">Start date</dt>
              <dd className="mt-1">{seminar.startDate.toLocaleDateString()}</dd>
              <dt className="font-medium text-foreground/70">End date</dt>
              <dd className="mt-1">{seminar.endDate?.toLocaleDateString() ?? "—"}</dd>
              <dt className="font-medium text-foreground/70">Venue</dt>
              <dd className="mt-1">{seminar.venue ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <WorkflowActions
                    entityType="Seminar"
          entityId={seminar.id}
          status={seminar.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionSeminar}
          workflowError={workflowError}
        />

        <Link href="/admin/seminars" className="text-sm text-brand hover:underline">
          ← Back to seminars
        </Link>
      </div>
    </Container>
  );
}
