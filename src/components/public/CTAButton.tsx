import type { ReactNode } from "react";
import Link, { type LinkProps } from "next/link";
import { clsx } from "clsx";

type Variant = "primary" | "secondary" | "ghost-on-navy";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--pub-radius-sm)] px-6 py-3 text-sm font-semibold tracking-wide transition-all duration-[var(--pub-duration-base)] ease-[var(--pub-ease)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pub-gold-500)]";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--pub-navy-900)] text-[var(--pub-ink-on-navy)] shadow-[var(--pub-shadow-sm)] hover:bg-[var(--pub-navy-800)] hover:shadow-[var(--pub-shadow-md)]",
  secondary:
    "border border-[var(--pub-border-strong)] bg-transparent text-[var(--pub-ink)] hover:border-[var(--pub-navy-700)] hover:bg-[var(--pub-navy-900)]/[0.04]",
  "ghost-on-navy":
    "border border-white/25 bg-white/5 text-[var(--pub-ink-on-navy)] backdrop-blur-sm hover:bg-white/15 hover:border-white/40",
};

/**
 * The public site's one CTA button system — every "Explore Programs" / "Apply for
 * Admission" / "Submit a grievance" button on the public site should use this rather than
 * the shared admin Button (src/components/ui/Button.tsx), which stays untouched.
 */
export function CTAButton({
  href,
  variant = "primary",
  className,
  children,
  ...props
}: LinkProps & { variant?: Variant; className?: string; children?: ReactNode; href: string }) {
  return (
    <Link href={href} className={clsx(base, variantClasses[variant], className)} {...props}>
      {children}
    </Link>
  );
}
