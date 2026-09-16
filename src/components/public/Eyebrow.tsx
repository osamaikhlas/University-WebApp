import type { ReactNode } from "react";
import { clsx } from "clsx";

/**
 * Small uppercase label used above an editorial heading ("section eyebrow text" — e.g.
 * "ADMISSIONS 2026–27" above a large headline). A short rule, not a full underline, keeps
 * it from reading as a link or badge.
 */
export function Eyebrow({
  children,
  tone = "navy",
  className,
}: {
  children: ReactNode;
  tone?: "navy" | "gold" | "on-navy";
  className?: string;
}) {
  const toneClasses = {
    navy: "text-[var(--pub-navy-700)] before:bg-[var(--pub-navy-700)]",
    gold: "text-[var(--pub-gold-600)] before:bg-[var(--pub-gold-500)]",
    "on-navy": "text-[var(--pub-gold-400)] before:bg-[var(--pub-gold-400)]",
  }[tone];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase",
        "before:h-px before:w-6 before:content-['']",
        toneClasses,
        className,
      )}
    >
      {children}
    </span>
  );
}
