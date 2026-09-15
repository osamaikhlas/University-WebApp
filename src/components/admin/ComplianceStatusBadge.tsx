import { clsx } from "clsx";
import type { ComplianceStatusValue } from "@/lib/compliance-workflow";

const STATUS_CLASSES: Record<ComplianceStatusValue, string> = {
  NOT_STARTED: "bg-surface-muted text-foreground/70 border-border-subtle",
  IN_PROGRESS: "bg-warning-bg text-warning-foreground border-warning-border",
  READY_FOR_REVIEW: "bg-info-bg text-info-foreground border-info-border",
  VERIFIED: "bg-success-bg text-success-foreground border-success-border",
  NEEDS_UPDATE: "bg-danger-bg text-danger-foreground border-danger-border",
  NOT_APPLICABLE: "bg-surface-muted text-foreground/60 border-border-subtle",
};

const STATUS_LABELS: Record<ComplianceStatusValue, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  READY_FOR_REVIEW: "Ready for review",
  VERIFIED: "Verified",
  NEEDS_UPDATE: "Needs update",
  NOT_APPLICABLE: "Not applicable",
};

export function ComplianceStatusBadge({ status }: { status: ComplianceStatusValue }) {
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
