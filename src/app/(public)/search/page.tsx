import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import {
  SEARCH_CATEGORIES,
  SEARCH_CATEGORY_LABELS,
  isSearchCategory,
  searchSite,
  type SearchCategory,
} from "@/lib/content";
import { parsePage } from "@/lib/pagination";

// Always render per-request: this page reads live, publish-gated content from the
// database (CLAUDE.md rule 4), so a stale statically-prerendered build must never be
// served here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const { q, category: categoryParam, page: pageParam } = await searchParams;
  const query = q?.trim() ?? "";
  const category: SearchCategory | undefined =
    categoryParam && isSearchCategory(categoryParam) ? categoryParam : undefined;
  const page = parsePage(pageParam);

  const response = query ? await searchSite({ query, category, page }) : null;

  return (
    <PublicPageShell title="Search" description="Search published content across the site.">
      <div className="flex flex-col gap-6">
        {/* Plain GET form: works without client-side JavaScript, and makes the search
            query (and filter/page) shareable/bookmarkable as a URL. */}
        <form action="/search" method="get" role="search" className="flex flex-wrap gap-2">
          <label htmlFor="q" className="sr-only">
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search pages, notices, programs, faculty, documents…"
            className="min-w-48 flex-1 rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          />
          <label htmlFor="category" className="sr-only">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={category ?? ""}
            className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            {SEARCH_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {SEARCH_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Search
          </button>
        </form>

        {!query ? null : response && response.results.length === 0 ? (
          <EmptyState
            title={`No published results found for "${query}".`}
            description="Only published content is searchable — draft or unapproved content never appears here."
          />
        ) : response ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-foreground/60">
              {response.totalCount} result{response.totalCount === 1 ? "" : "s"} for &ldquo;{query}
              &rdquo;
              {category ? ` in ${SEARCH_CATEGORY_LABELS[category]}` : ""}.
            </p>

            <ul className="flex flex-col gap-3" aria-label={`Search results for ${query}`}>
              {response.results.map((result, index) => (
                <li key={`${result.type}-${result.title}-${index}`}>
                  <Card className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">
                      {result.typeLabel}
                    </p>
                    <Link href={result.href} className="text-sm font-medium hover:underline">
                      {result.title}
                    </Link>
                    {result.snippet ? (
                      <p className="mt-1 line-clamp-2 text-sm text-foreground/70">
                        {result.snippet}
                      </p>
                    ) : null}
                  </Card>
                </li>
              ))}
            </ul>

            <Pagination
              basePath="/search"
              searchParams={{ q: query, category: categoryParam }}
              page={response.page}
              totalPages={response.totalPages}
            />
          </div>
        ) : null}
      </div>
    </PublicPageShell>
  );
}
