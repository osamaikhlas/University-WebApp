import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getReviewPeriodDays, type ReviewableModule } from "@/lib/admin/review-settings";

/**
 * Content review/freshness tracking — distinct from (and complementary to) the publish
 * workflow in content-workflow.ts. A record can be PUBLISHED and fully correct in its
 * workflow status while still being *stale*: nobody has confirmed the information is still
 * accurate. This is the "for relevant content show: last updated, last reviewed, next review
 * date, reviewer" + "overdue reviews" requirement.
 */

export type ReviewFreshness = {
  lastUpdated: Date;
  lastReviewedAt: Date | null;
  nextReviewDue: Date;
  isOverdue: boolean;
};

export type ReviewableRecord = {
  updatedAt: Date;
  createdAt: Date;
  publishedAt: Date | null;
  lastReviewedAt: Date | null;
};

/**
 * "Next review due" is always computed live from the configured period — (lastReviewedAt ??
 * publishedAt ?? createdAt) + periodDays — never stored on the record itself. That's a
 * deliberate choice: it means changing a module's review period (the "make the review period
 * configurable" requirement) immediately and retroactively changes every record's overdue
 * status, with no backfill migration ever needed. A record that's never been explicitly
 * reviewed still gets a real due date, anchored to when it went live (or was created, if never
 * published) — so newly published content becomes due for its first review after one period,
 * not immediately and not never.
 */
export function computeReviewFreshness(
  record: ReviewableRecord,
  periodDays: number,
  now: Date = new Date(),
): ReviewFreshness {
  const anchor = record.lastReviewedAt ?? record.publishedAt ?? record.createdAt;
  const nextReviewDue = new Date(anchor);
  nextReviewDue.setDate(nextReviewDue.getDate() + periodDays);

  return {
    lastUpdated: record.updatedAt,
    lastReviewedAt: record.lastReviewedAt,
    nextReviewDue,
    isOverdue: nextReviewDue.getTime() < now.getTime(),
  };
}

/** Records a review confirmation ("this content is still accurate as of today") and writes the
 * audit entry — the single write path every module's `markXReviewed` Server Action calls into,
 * mirroring how `applyWorkflowTransition`/`markContentReviewed`'s siblings centralize their own
 * shared mutation + audit pattern. Does not check permissions itself; every caller calls
 * `requirePermission` first (CLAUDE.md rule 5), same convention as `applyWorkflowTransition`. */
export async function markContentReviewed(params: {
  entityType: string;
  entityId: string;
  actorId: string;
  update: (data: { lastReviewedAt: Date; lastReviewedById: string }) => Promise<unknown>;
}): Promise<void> {
  const lastReviewedAt = new Date();
  await params.update({ lastReviewedAt, lastReviewedById: params.actorId });

  await logAudit({
    actorId: params.actorId,
    action: "MARK_REVIEWED",
    entityType: params.entityType,
    entityId: params.entityId,
    after: { lastReviewedAt: lastReviewedAt.toISOString(), lastReviewedById: params.actorId },
  });
}

export type ReviewDisplayData = ReviewFreshness & {
  reviewerName: string | null;
  periodDays: number;
};

/** Everything one module view page needs to render a `ReviewPanel`: the freshness computation
 * plus the reviewer's display name (resolved from the plain `lastReviewedById` id — this app's
 * established convention for actor stamps, see prisma/schema.prisma's audit-stamp comment) and
 * the module's current configured period. */
export async function getReviewDisplayData(
  moduleKey: ReviewableModule,
  record: ReviewableRecord & { lastReviewedById: string | null },
): Promise<ReviewDisplayData> {
  const periodDays = await getReviewPeriodDays(moduleKey);
  const freshness = computeReviewFreshness(record, periodDays);

  const reviewer = record.lastReviewedById
    ? await prisma.user.findUnique({ where: { id: record.lastReviewedById }, select: { name: true } })
    : null;

  return { ...freshness, reviewerName: reviewer?.name ?? null, periodDays };
}
