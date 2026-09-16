import type { ReactNode } from "react";
import { clsx } from "clsx";

/**
 * Public-site container — deliberately separate from src/components/ui/Container (which
 * 150+ admin pages also use at a narrower max-width). Wider by default so editorial
 * sections have room to breathe; `size="wide"` for full-bleed hero/gallery moments,
 * `size="narrow"` for long-form reading measure (e.g. a notice/article body).
 */
export function PublicContainer({
  size = "normal",
  className,
  children,
}: {
  size?: "narrow" | "normal" | "wide";
  className?: string;
  children: ReactNode;
}) {
  const maxWidth =
    size === "wide"
      ? "max-w-[var(--pub-container-wide)]"
      : size === "narrow"
        ? "max-w-[var(--pub-container-narrow)]"
        : "max-w-[var(--pub-container-normal)]";

  return (
    <div className={clsx("mx-auto w-full px-5 sm:px-8 lg:px-10", maxWidth, className)}>
      {children}
    </div>
  );
}
