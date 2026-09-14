import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link, { type LinkProps } from "next/link";
import { clsx } from "clsx";

export type ButtonVariant = "primary" | "secondary";

const BASE_CLASSES =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 disabled:pointer-events-none";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-foreground hover:opacity-90",
  secondary:
    "bg-transparent text-foreground border border-border-subtle hover:bg-surface-muted",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={clsx(BASE_CLASSES, variantClasses[variant], className)}
      {...props}
    />
  );
}

/**
 * A `<Link>` styled identically to `Button`, for CTAs that navigate rather than submit —
 * e.g. the homepage hero. Keeping this a real anchor (not a `<button onClick={navigate}>`)
 * matters for accessibility (correct role/keyboard behavior) and SEO (a crawlable link).
 */
export function LinkButton({
  variant = "primary",
  className,
  ...props
}: LinkProps & { variant?: ButtonVariant; className?: string; children?: ReactNode }) {
  return <Link className={clsx(BASE_CLASSES, variantClasses[variant], className)} {...props} />;
}
