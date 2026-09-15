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
import { transitionExamination } from "@/app/admin/exams/actions";

export const metadata: Metadata = { title: "Examination" };

export default async function ExaminationViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workflowError?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.examinations.view);
  const { id } = await params;
  const { workflowError } = await searchParams;

  const examination = await prisma.examination.findUnique({
    where: { id },
    include: { program: true, notice: true },
  });
  if (!examination) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.examinations.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.examinations.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={examination.examType} description="Examination" />
          <div className="flex items-center gap-2">
            <StatusBadge status={examination.status} />
            {canManage ? (
              <LinkButton href={`/admin/exams/${examination.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {examination.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Program</dt>
              <dd className="mt-1">{examination.program.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Academic year</dt>
              <dd className="mt-1">{examination.academicYear ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Linked notice</dt>
              <dd className="mt-1">{examination.notice?.title ?? "—"}</dd>
            </div>
            <div className="grid gap-x-4 sm:grid-flow-col sm:grid-rows-2 sm:grid-cols-2">
              <dt className="font-medium text-foreground/70">Schedule start date</dt>
              <dd className="mt-1">
                {examination.scheduleStartDate?.toLocaleDateString() ?? "—"}
              </dd>
              <dt className="font-medium text-foreground/70">Schedule end date</dt>
              <dd className="mt-1">{examination.scheduleEndDate?.toLocaleDateString() ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <WorkflowActions
                    entityType="Examination"
          entityId={examination.id}
          status={examination.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionExamination}
          workflowError={workflowError}
        />

        <Link href="/admin/exams" className="text-sm text-brand hover:underline">
          ← Back to exams
        </Link>
      </div>
    </Container>
  );
}
