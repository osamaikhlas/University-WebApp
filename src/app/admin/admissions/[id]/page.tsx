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
import { transitionAdmission } from "@/app/admin/admissions/actions";

export const metadata: Metadata = { title: "Admission" };

export default async function AdmissionViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workflowError?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.admissions.view);
  const { id } = await params;
  const { workflowError } = await searchParams;

  const admission = await prisma.admission.findUnique({
    where: { id },
    include: { program: true },
  });
  if (!admission) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.admissions.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.admissions.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading
            title={`${admission.program.name} — ${admission.academicYear}`}
            description="Admission cycle"
          />
          <div className="flex items-center gap-2">
            <StatusBadge status={admission.status} />
            {canManage ? (
              <LinkButton href={`/admin/admissions/${admission.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {admission.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Program</dt>
              <dd className="mt-1">{admission.program.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Eligibility criteria</dt>
              <dd className="mt-1 whitespace-pre-wrap">{admission.eligibilityCriteria ?? "—"}</dd>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="font-medium text-foreground/70">Application start date</dt>
                <dd className="mt-1">
                  {admission.applicationStartDate?.toLocaleDateString() ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground/70">Application end date</dt>
                <dd className="mt-1">
                  {admission.applicationEndDate?.toLocaleDateString() ?? "—"}
                </dd>
              </div>
            </div>
          </dl>
        </Card>

        <WorkflowActions
          entityId={admission.id}
          status={admission.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionAdmission}
          workflowError={workflowError}
        />

        <Link href="/admin/admissions" className="text-sm text-brand hover:underline">
          ← Back to admissions
        </Link>
      </div>
    </Container>
  );
}
