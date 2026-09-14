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
import { transitionTimetable } from "@/app/admin/timetables/actions";

export const metadata: Metadata = { title: "Timetable" };

export default async function TimetableViewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(MODULE_PERMISSIONS.timetables.view);
  const { id } = await params;

  const timetable = await prisma.timetable.findUnique({ where: { id }, include: { program: true } });
  if (!timetable) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.timetables.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.timetables.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={timetable.classGroup} description="Timetable" />
          <div className="flex items-center gap-2">
            <StatusBadge status={timetable.status} />
            {canManage ? (
              <LinkButton href={`/admin/timetables/${timetable.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {timetable.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Program</dt>
              <dd className="mt-1">{timetable.program.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Effective from</dt>
              <dd className="mt-1">{timetable.effectiveFrom.toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Schedule</dt>
              <dd className="mt-1">
                {timetable.structuredSchedule != null ? (
                  <pre className="overflow-x-auto rounded-md bg-surface-muted p-3 text-xs">
                    {JSON.stringify(timetable.structuredSchedule, null, 2)}
                  </pre>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
        </Card>

        <WorkflowActions
          entityId={timetable.id}
          status={timetable.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionTimetable}
        />

        <Link href="/admin/timetables" className="text-sm text-brand hover:underline">
          ← Back to timetables
        </Link>
      </div>
    </Container>
  );
}
