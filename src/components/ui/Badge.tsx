import type { ReactNode } from "react";
import { clsx } from "clsx";

type BadgeTone = "neutral" | "placeholder" | "brand";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-foreground/70 border-border-subtle",
  placeholder: "bg-placeholder-bg text-placeholder-foreground border-placeholder-border",
  brand: "bg-brand text-brand-foreground border-transparent",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
