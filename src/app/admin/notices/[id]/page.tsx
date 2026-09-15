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
import { transitionNotice, markNoticeReviewed } from "@/app/admin/notices/actions";

export const metadata: Metadata = { title: "Notice" };

export default async function NoticeViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workflowError?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.notices.view);
  const { id } = await params;
  const { workflowError } = await searchParams;

  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.notices.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.notices.publish);
  const review = await getReviewDisplayData("notices", notice);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={notice.title} description="Notice" />
          <div className="flex items-center gap-2">
            <StatusBadge status={notice.status} />
            {canManage ? (
              <LinkButton href={`/admin/notices/${notice.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {notice.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Body</dt>
              <dd className="mt-1 whitespace-pre-wrap">{notice.body}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Category</dt>
              <dd className="mt-1">{notice.category ?? "—"}</dd>
            </div>
            <div className="grid gap-x-4 sm:grid-flow-col sm:grid-rows-2 sm:grid-cols-2">
              <dt className="font-medium text-foreground/70">Publish date</dt>
              <dd className="mt-1">{notice.publishDate?.toLocaleDateString() ?? "—"}</dd>
              <dt className="font-medium text-foreground/70">Expiry date</dt>
              <dd className="mt-1">{notice.expiryDate?.toLocaleDateString() ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <WorkflowActions
                    entityType="Notice"
          entityId={notice.id}
          status={notice.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionNotice}
          workflowError={workflowError}
        />

        <ReviewPanel
          entityId={notice.id}
          lastUpdated={review.lastUpdated}
          lastReviewedAt={review.lastReviewedAt}
          nextReviewDue={review.nextReviewDue}
          reviewerName={review.reviewerName}
          isOverdue={review.isOverdue}
          periodDays={review.periodDays}
          canMarkReviewed={canPublish}
          markReviewed={markNoticeReviewed}
        />

        <Link href="/admin/notices" className="text-sm text-brand hover:underline">
          ← Back to notices
        </Link>
      </div>
    </Container>
  );
}
