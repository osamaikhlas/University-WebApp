import { clsx } from "clsx";
import type { GrievanceStatusValue } from "@/lib/grievance-workflow";

const STATUS_CLASSES: Record<GrievanceStatusValue, string> = {
  NEW: "bg-info-bg text-info-foreground border-info-border",
  ASSIGNED: "bg-surface-muted text-foreground/70 border-border-subtle",
  UNDER_REVIEW: "bg-warning-bg text-warning-foreground border-warning-border",
  ACTION_REQUIRED: "bg-danger-bg text-danger-foreground border-danger-border",
  RESOLVED: "bg-success-bg text-success-foreground border-success-border",
  CLOSED: "bg-surface-muted text-foreground/60 border-border-subtle",
};

const STATUS_LABELS: Record<GrievanceStatusValue, string> = {
  NEW: "New",
  ASSIGNED: "Assigned",
  UNDER_REVIEW: "Under review",
  ACTION_REQUIRED: "Action required",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export function GrievanceStatusBadge({ status }: { status: GrievanceStatusValue }) {
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

export { STATUS_LABELS as GRIEVANCE_STATUS_LABELS };
