import type { ReactNode } from "react";
import { clsx } from "clsx";

/**
 * A large-number/label pair (e.g. "25+ / Years of Education") used in the About section's
 * stat row. `isPlaceholder` renders a small "(demo)" marker inline — CLAUDE.md rule 14 (never
 * let placeholder figures read as verified facts) applies to stats exactly as it does to any
 * other content, even though these numbers are visually prominent.
 */
export function StatBlock({
  value,
  label,
  isPlaceholder,
  tone = "ink",
}: {
  value: ReactNode;
  label: ReactNode;
  isPlaceholder?: boolean;
  tone?: "ink" | "on-navy";
}) {
  const isOnNavy = tone === "on-navy";

  return (
    <div className="flex flex-col gap-1">
      <p
        className={clsx(
          "pub-font-display text-4xl leading-none font-medium sm:text-5xl",
          isOnNavy ? "text-[var(--pub-ink-on-navy)]" : "text-[var(--pub-navy-900)]",
        )}
      >
        {value}
      </p>
      <p
        className={clsx(
          "text-sm",
          isOnNavy ? "text-[var(--pub-ink-on-navy-muted)]" : "text-[var(--pub-ink-muted)]",
        )}
      >
        {label}
        {isPlaceholder ? (
          <span className="ml-1.5 text-[var(--pub-gold-600)]">(demo)</span>
        ) : null}
      </p>
    </div>
  );
}
