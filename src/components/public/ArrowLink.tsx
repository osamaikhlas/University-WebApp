import type { ReactNode } from "react";
import Link from "next/link";
import { clsx } from "clsx";

/**
 * The "Explore →" / "View all →" text link used throughout the public site. The arrow
 * nudges right on hover/focus via a CSS transform (no JS), and respects
 * prefers-reduced-motion automatically since it's a transform transition, not a
 * translate-triggering layout change — reduced-motion users still see the color/underline
 * change, just not the slide.
 */
export function ArrowLink({
  href,
  children,
  tone = "navy",
  className,
}: {
  href: string;
  children: ReactNode;
  tone?: "navy" | "on-navy" | "gold";
  className?: string;
}) {
  const toneClasses = {
    navy: "text-[var(--pub-navy-800)] decoration-[var(--pub-navy-800)]/30 hover:decoration-[var(--pub-navy-800)]",
    "on-navy":
      "text-[var(--pub-ink-on-navy)] decoration-[var(--pub-ink-on-navy)]/30 hover:decoration-[var(--pub-ink-on-navy)]",
    gold: "text-[var(--pub-gold-600)] decoration-[var(--pub-gold-600)]/30 hover:decoration-[var(--pub-gold-600)]",
  }[tone];

  return (
    <Link
      href={href}
      className={clsx(
        "group inline-flex items-center gap-1.5 text-sm font-semibold underline decoration-1 underline-offset-4 transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--pub-gold-500)] focus-visible:rounded-xs",
        toneClasses,
        className,
      )}
    >
      {children}
      <span
        aria-hidden="true"
        className="inline-block transition-transform duration-[var(--pub-duration-base)] ease-[var(--pub-ease)] group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0"
      >
        →
      </span>
    </Link>
  );
}
