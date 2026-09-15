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
import { transitionEnrollmentStatistic } from "@/app/admin/enrollment-statistics/actions";

export const metadata: Metadata = { title: "Enrollment Statistic" };

export default async function EnrollmentStatisticViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workflowError?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.enrollmentStatistics.view);
  const { id } = await params;
  const { workflowError } = await searchParams;

  const enrollmentStatistic = await prisma.enrollmentStatistic.findUnique({
    where: { id },
    include: { program: true },
  });
  if (!enrollmentStatistic) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.enrollmentStatistics.manage);
  const canPublish = hasPermission(
    user.permissions,
    MODULE_PERMISSIONS.enrollmentStatistics.publish,
  );

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading
            title={`${enrollmentStatistic.program.name} — ${enrollmentStatistic.academicYear}`}
            description="Enrollment statistic"
          />
          <div className="flex items-center gap-2">
            <StatusBadge status={enrollmentStatistic.status} />
            {canManage ? (
              <LinkButton
                href={`/admin/enrollment-statistics/${enrollmentStatistic.id}/edit`}
                variant="secondary"
              >
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {enrollmentStatistic.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Program</dt>
              <dd className="mt-1">{enrollmentStatistic.program.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Session</dt>
              <dd className="mt-1">{enrollmentStatistic.sessionType ?? "—"}</dd>
            </div>
            <div className="grid gap-x-4 sm:grid-flow-col sm:grid-rows-2 sm:grid-cols-3">
              <dt className="font-medium text-foreground/70">Total enrolled</dt>
              <dd className="mt-1">{enrollmentStatistic.totalEnrolled}</dd>
              <dt className="font-medium text-foreground/70">Male</dt>
              <dd className="mt-1">{enrollmentStatistic.maleCount ?? "—"}</dd>
              <dt className="font-medium text-foreground/70">Female</dt>
              <dd className="mt-1">{enrollmentStatistic.femaleCount ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <WorkflowActions
                    entityType="EnrollmentStatistic"
          entityId={enrollmentStatistic.id}
          status={enrollmentStatistic.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionEnrollmentStatistic}
          workflowError={workflowError}
        />

        <Link href="/admin/enrollment-statistics" className="text-sm text-brand hover:underline">
          ← Back to enrollment statistics
        </Link>
      </div>
    </Container>
  );
}
