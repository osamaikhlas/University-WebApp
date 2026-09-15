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
import { ReviewPanel } from "@/components/admin/ReviewPanel";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { getReviewDisplayData } from "@/lib/content-review";
import { transitionFaculty, markFacultyReviewed } from "@/app/admin/faculty/actions";

export const metadata: Metadata = { title: "Faculty record" };

export default async function FacultyViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workflowError?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.faculty.view);
  const { id } = await params;
  const { workflowError } = await searchParams;

  const faculty = await prisma.faculty.findUnique({ where: { id }, include: { department: true } });
  if (!faculty) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.faculty.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.faculty.publish);
  const review = await getReviewDisplayData("faculty", faculty);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={faculty.name} description="Faculty record" />
          <div className="flex items-center gap-2">
            <StatusBadge status={faculty.status} />
            {canManage ? (
              <LinkButton href={`/admin/faculty/${faculty.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {faculty.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Designation</dt>
              <dd className="mt-1">{faculty.designation}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Department</dt>
              <dd className="mt-1">{faculty.department.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Qualifications</dt>
              <dd className="mt-1">{faculty.qualifications ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Subjects taught</dt>
              <dd className="mt-1">
                {faculty.subjectsTaught.length > 0 ? faculty.subjectsTaught.join(", ") : "—"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Contact</dt>
              <dd className="mt-1">{faculty.email ?? faculty.phone ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <WorkflowActions
                    entityType="Faculty"
          entityId={faculty.id}
          status={faculty.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionFaculty}
          workflowError={workflowError}
        />

        <ReviewPanel
          entityId={faculty.id}
          lastUpdated={review.lastUpdated}
          lastReviewedAt={review.lastReviewedAt}
          nextReviewDue={review.nextReviewDue}
          reviewerName={review.reviewerName}
          isOverdue={review.isOverdue}
          periodDays={review.periodDays}
          canMarkReviewed={canPublish}
          markReviewed={markFacultyReviewed}
        />

        <Link href="/admin/faculty" className="text-sm text-brand hover:underline">
          ← Back to faculty
        </Link>
      </div>
    </Container>
  );
}
