import type { ComponentPropsWithoutRef } from "react";
import { clsx } from "clsx";

/**
 * Public-site card — restrained border, soft shadow, no heavy rounding. Distinct from
 * src/components/ui/Card.tsx (shared with the admin portal) so the two visual languages
 * never collide. Not every public section uses this — the brief explicitly warns against
 * "everything inside cards"; reach for a plain `<li>`/row layout first, and use this only
 * where a bounded surface genuinely helps (e.g. a notice/program preview tile).
 */
export function PublicCard({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={clsx(
        "rounded-[var(--pub-radius-md)] border border-[var(--pub-border)] bg-[var(--pub-surface)] shadow-[var(--pub-shadow-sm)] transition-shadow duration-[var(--pub-duration-base)] ease-[var(--pub-ease)]",
        className,
      )}
      {...props}
    />
  );
}
