import type { ReactNode } from "react";
import Link from "next/link";
import { PublicContainer } from "@/components/public/Container";
import { Eyebrow } from "@/components/public/Eyebrow";

/**
 * The shared page intro every public inner page is built on — replaces the old shared
 * PageHeading/Breadcrumbs (src/components/ui/**) with the editorial public visual language,
 * so every one of the ~20 public routes gets a consistent, elevated intro even before its
 * own body content is individually redesigned. `eyebrow` defaults to the section's own
 * label so callers don't need to repeat it, but can be overridden (e.g. a category name on
 * a detail page).
 */
export function PublicPageShell({
  eyebrow,
  title,
  description,
  breadcrumbLabel,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Defaults to `title` — override when the nav label and page heading should differ. */
  breadcrumbLabel?: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="border-b border-[var(--pub-border)] bg-[var(--pub-cream-deep)]">
        <PublicContainer>
          <div className="flex flex-col gap-5 py-10 sm:py-14">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--pub-ink-muted)]">
                <li>
                  <Link href="/" className="hover:text-[var(--pub-navy-900)] hover:underline">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-[var(--pub-ink-soft)]">
                  {breadcrumbLabel ?? title}
                </li>
              </ol>
            </nav>
            <div className="flex flex-col gap-3">
              <Eyebrow>{eyebrow ?? "Official Information"}</Eyebrow>
              <h1 className="pub-font-display max-w-3xl text-4xl leading-[1.05] font-medium tracking-tight text-[var(--pub-ink)] sm:text-5xl">
                {title}
              </h1>
              {description ? (
                <p className="max-w-2xl text-base leading-relaxed text-[var(--pub-ink-soft)] sm:text-lg">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
        </PublicContainer>
      </div>
      <PublicContainer>
        <div className="flex flex-col gap-10 py-10 sm:py-14">{children}</div>
      </PublicContainer>
    </>
  );
}
