import { clsx } from "clsx";
import type { ContentStatusValue } from "@/lib/content-workflow";

const STATUS_CLASSES: Record<ContentStatusValue, string> = {
  DRAFT: "bg-surface-muted text-foreground/70 border-border-subtle",
  SUBMITTED: "bg-warning-bg text-warning-foreground border-warning-border",
  UNDER_REVIEW: "bg-warning-bg text-warning-foreground border-warning-border",
  APPROVED: "bg-info-bg text-info-foreground border-info-border",
  PUBLISHED: "bg-success-bg text-success-foreground border-success-border",
  UPDATE_REQUIRED: "bg-danger-bg text-danger-foreground border-danger-border",
};

const STATUS_LABELS: Record<ContentStatusValue, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  UPDATE_REQUIRED: "Update required",
};

export function StatusBadge({ status }: { status: ContentStatusValue }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_CLASSES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
