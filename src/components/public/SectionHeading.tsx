import type { ReactNode } from "react";
import { clsx } from "clsx";
import { Eyebrow } from "@/components/public/Eyebrow";
import { ArrowLink } from "@/components/public/ArrowLink";

/**
 * The recurring section header across the public site: optional eyebrow, a large editorial
 * headline, optional supporting copy, optional "View all" link. Deliberately varies from
 * the shared admin PageHeading (src/components/ui/PageHeading.tsx) rather than extending
 * it, so the two visual languages never have to stay in lockstep.
 */
export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "left",
  tone = "ink",
  viewAllHref,
  viewAllLabel = "View all",
  className,
}: {
  /** Set this to match the enclosing `<section aria-labelledby>` — every call site must
   * pass one; otherwise the section's accessible name silently falls back to nothing. */
  id: string;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  tone?: "ink" | "on-navy";
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
}) {
  const isOnNavy = tone === "on-navy";

  return (
    <div
      className={clsx(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      <div className={clsx("flex flex-wrap items-end justify-between gap-4", align === "center" && "justify-center")}>
        <div className="flex flex-col gap-3">
          {eyebrow ? <Eyebrow tone={isOnNavy ? "on-navy" : "navy"}>{eyebrow}</Eyebrow> : null}
          <h2
            id={id}
            className={clsx(
              "pub-font-display text-3xl leading-[1.08] font-medium tracking-tight sm:text-4xl lg:text-[2.75rem]",
              isOnNavy ? "text-[var(--pub-ink-on-navy)]" : "text-[var(--pub-ink)]",
            )}
          >
            {title}
          </h2>
        </div>
        {viewAllHref && align === "left" ? (
          // Wrapped, not passed directly as ArrowLink's className: ArrowLink's own base
          // classes already include `inline-flex`, an unprefixed display utility that beats
          // an unprefixed `hidden` override applied to the same element regardless of prop
          // order (Tailwind's cascade is by generated rule order, not JSX attribute order).
          // A wrapper element keeps the two `display` utilities from ever competing.
          <span className="hidden shrink-0 sm:inline-flex">
            <ArrowLink href={viewAllHref} tone={isOnNavy ? "on-navy" : "navy"}>
              {viewAllLabel}
            </ArrowLink>
          </span>
        ) : null}
      </div>
      {description ? (
        <p
          className={clsx(
            "max-w-2xl text-base leading-relaxed sm:text-lg",
            isOnNavy ? "text-[var(--pub-ink-on-navy-muted)]" : "text-[var(--pub-ink-soft)]",
          )}
        >
          {description}
        </p>
      ) : null}
      {viewAllHref && align === "left" ? (
        <span className="sm:hidden">
          <ArrowLink href={viewAllHref} tone={isOnNavy ? "on-navy" : "navy"}>
            {viewAllLabel}
          </ArrowLink>
        </span>
      ) : null}
    </div>
  );
}
