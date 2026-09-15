import Link from "next/link";
import type { ReactNode } from "react";
import { clsx } from "clsx";

type StatTone = "neutral" | "success" | "warning" | "danger";

const toneClasses: Record<StatTone, string> = {
  neutral: "border-border-subtle",
  success: "border-success-border",
  warning: "border-warning-border",
  danger: "border-danger-border",
};

const valueToneClasses: Record<StatTone, string> = {
  neutral: "text-foreground",
  success: "text-success-foreground",
  warning: "text-warning-foreground",
  danger: "text-danger-foreground",
};

/**
 * A single dashboard summary number — every value passed in must already come from a real
 * database query (CLAUDE.md: "do not fabricate statistics"); this component only renders
 * whatever number/tone its caller computed, it never invents one on its own. `href`, when
 * given, makes the whole card a link to where that number came from (e.g. the filtered admin
 * list), so a stat is never a dead end.
 */
export function StatCard({
  label,
  value,
  description,
  href,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  description?: ReactNode;
  href?: string;
  tone?: StatTone;
}) {
  const content = (
    <div
      data-stat-card={label}
      className={clsx(
        "flex flex-col gap-1 rounded-lg border bg-surface p-4 shadow-sm transition-colors",
        toneClasses[tone],
        href && "hover:bg-surface-muted",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">{label}</p>
      <p className={clsx("text-3xl font-semibold tabular-nums", valueToneClasses[tone])}>{value}</p>
      {description ? <p className="text-xs text-foreground/60">{description}</p> : null}
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
      {content}
    </Link>
  );
}
