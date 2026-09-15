import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

/**
 * Shared "review status" panel rendered on every reviewable module's view page — last
 * updated, last reviewed, next review date, reviewer (the per-record display requirement),
 * plus a "Mark reviewed" action when the viewer holds the module's publish-tier permission
 * (reviewing for accuracy is a higher-trust check, the same tier as approve/publish — see
 * src/lib/content-review.ts's doc comment). `markReviewed` is bound to `entityId` here rather
 * than by the caller, mirroring how `WorkflowActions` binds `transition`.
 */
export function ReviewPanel({
  entityId,
  lastUpdated,
  lastReviewedAt,
  nextReviewDue,
  reviewerName,
  isOverdue,
  periodDays,
  canMarkReviewed,
  markReviewed,
}: {
  entityId: string;
  lastUpdated: Date;
  lastReviewedAt: Date | null;
  nextReviewDue: Date;
  reviewerName: string | null;
  isOverdue: boolean;
  periodDays: number;
  canMarkReviewed: boolean;
  markReviewed: (id: string) => Promise<void>;
}) {
  return (
    <Card data-review-panel="true">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Review status</h2>
        {canMarkReviewed ? (
          <form action={markReviewed.bind(null, entityId)}>
            <Button type="submit" variant="secondary">
              Mark reviewed
            </Button>
          </form>
        ) : null}
      </div>

      {isOverdue ? (
        <Alert tone="warning" className="mb-3">
          Overdue for review — this content should be reviewed at least every {periodDays} days.
        </Alert>
      ) : null}

      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-foreground/70">Last updated</dt>
          <dd className="mt-1">{lastUpdated.toLocaleDateString()}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground/70">Last reviewed</dt>
          <dd className="mt-1">{lastReviewedAt ? lastReviewedAt.toLocaleDateString() : "Never reviewed"}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground/70">Next review due</dt>
          <dd className={`mt-1 ${isOverdue ? "font-medium text-danger-foreground" : ""}`}>
            {nextReviewDue.toLocaleDateString()}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-foreground/70">Reviewer</dt>
          <dd className="mt-1">{reviewerName ?? "—"}</dd>
        </div>
      </dl>
    </Card>
  );
}
