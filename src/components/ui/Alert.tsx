import type { ReactNode } from "react";
import { clsx } from "clsx";

type AlertTone = "info" | "success" | "warning" | "danger";

const toneClasses: Record<AlertTone, string> = {
  info: "bg-info-bg border-info-border text-info-foreground",
  success: "bg-success-bg border-success-border text-success-foreground",
  warning: "bg-warning-bg border-warning-border text-warning-foreground",
  danger: "bg-danger-bg border-danger-border text-danger-foreground",
};

/**
 * Semantic status message. `role="alert"` (assertive) is reserved for `danger`/`warning` —
 * the tones that represent something going wrong the user should notice immediately.
 * `info`/`success` use `role="status"` (polite), matching WAI-ARIA guidance that `alert`
 * shouldn't be used for routine confirmations.
 */
export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const isUrgent = tone === "danger" || tone === "warning";

  return (
    <div
      role={isUrgent ? "alert" : "status"}
      className={clsx("rounded-lg border px-4 py-3 text-sm", toneClasses[tone], className)}
    >
      {title ? <p className="mb-1 font-medium">{title}</p> : null}
      <div>{children}</div>
    </div>
  );
}
