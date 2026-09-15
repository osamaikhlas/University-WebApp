import Link from "next/link";
import { clsx } from "clsx";

/** Builds `basePath?<preservedParams>&page=N`, dropping `page` from whatever's already in
 * `searchParams` so it's never duplicated. */
function pageHref(basePath: string, searchParams: Record<string, string | undefined>, page: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || !value) continue;
    params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** Prev/next + page-number pagination driven by a `?page=` query param, preserving every
 * other search param (filters/search terms) already on the page. */
export function Pagination({
  basePath,
  searchParams,
  page,
  totalPages,
}: {
  basePath: string;
  searchParams: Record<string, string | undefined>;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  // Cap the visible page-number window to 7 around the current page so this stays usable
  // even when a list grows into the hundreds of pages.
  const windowSize = 7;
  const start = Math.max(1, Math.min(page - Math.floor(windowSize / 2), totalPages - windowSize + 1));
  const end = Math.min(totalPages, start + windowSize - 1);
  const pageNumbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center gap-2 text-sm">
      <Link
        href={pageHref(basePath, searchParams, Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={clsx(
          "inline-flex items-center rounded-md border border-border-subtle px-3 py-1.5",
          page <= 1
            ? "pointer-events-none opacity-40"
            : "text-foreground/80 hover:bg-surface-muted",
        )}
      >
        Previous
      </Link>

      <span className="px-1 text-foreground/60">
        Page {page} of {totalPages}
      </span>

      {pageNumbers.map((pageNumber) => (
        <Link
          key={pageNumber}
          href={pageHref(basePath, searchParams, pageNumber)}
          aria-current={pageNumber === page ? "page" : undefined}
          className={clsx(
            "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2",
            pageNumber === page
              ? "border-brand bg-brand text-brand-foreground"
              : "border-border-subtle text-foreground/70 hover:bg-surface-muted",
          )}
        >
          {pageNumber}
        </Link>
      ))}

      <Link
        href={pageHref(basePath, searchParams, Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={clsx(
          "inline-flex items-center rounded-md border border-border-subtle px-3 py-1.5",
          page >= totalPages
            ? "pointer-events-none opacity-40"
            : "text-foreground/80 hover:bg-surface-muted",
        )}
      >
        Next
      </Link>
    </nav>
  );
}
