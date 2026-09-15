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
import {
  transitionAcademicCalendarEntry,
  markAcademicCalendarEntryReviewed,
} from "@/app/admin/academic-calendar/actions";

export const metadata: Metadata = { title: "Calendar entry" };

export default async function AcademicCalendarEntryViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workflowError?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.academicCalendar.view);
  const { id } = await params;
  const { workflowError } = await searchParams;

  const entry = await prisma.academicCalendar.findUnique({ where: { id } });
  if (!entry) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.academicCalendar.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.academicCalendar.publish);
  const review = await getReviewDisplayData("academicCalendar", entry);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={entry.title} description="Academic calendar entry" />
          <div className="flex items-center gap-2">
            <StatusBadge status={entry.status} />
            {canManage ? (
              <LinkButton href={`/admin/academic-calendar/${entry.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {entry.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap">{entry.description ?? "—"}</dd>
            </div>
            <div className="grid gap-x-4 sm:grid-flow-col sm:grid-rows-2 sm:grid-cols-2">
              <dt className="font-medium text-foreground/70">Start date</dt>
              <dd className="mt-1">{entry.startDate.toLocaleDateString()}</dd>
              <dt className="font-medium text-foreground/70">End date</dt>
              <dd className="mt-1">{entry.endDate?.toLocaleDateString() ?? "—"}</dd>
            </div>
            <div className="grid gap-x-4 sm:grid-flow-col sm:grid-rows-2 sm:grid-cols-2">
              <dt className="font-medium text-foreground/70">Category</dt>
              <dd className="mt-1">{entry.category ?? "—"}</dd>
              <dt className="font-medium text-foreground/70">Academic year</dt>
              <dd className="mt-1">{entry.academicYear ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <WorkflowActions
                    entityType="AcademicCalendar"
          entityId={entry.id}
          status={entry.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionAcademicCalendarEntry}
          workflowError={workflowError}
        />

        <ReviewPanel
          entityId={entry.id}
          lastUpdated={review.lastUpdated}
          lastReviewedAt={review.lastReviewedAt}
          nextReviewDue={review.nextReviewDue}
          reviewerName={review.reviewerName}
          isOverdue={review.isOverdue}
          periodDays={review.periodDays}
          canMarkReviewed={canPublish}
          markReviewed={markAcademicCalendarEntryReviewed}
        />

        <Link href="/admin/academic-calendar" className="text-sm text-brand hover:underline">
          ← Back to academic calendar
        </Link>
      </div>
    </Container>
  );
}
