import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { searchSite } from "@/lib/content";

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
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query ? await searchSite(query) : [];

  return (
    <PublicPageShell title="Search" description="Search published content across the site.">
      <div className="flex flex-col gap-6">
        {/* Plain GET form: works without client-side JavaScript, and makes the search
            query shareable/bookmarkable as a URL. */}
        <form action="/search" method="get" role="search" className="flex gap-2">
          <label htmlFor="q" className="sr-only">
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search notices, programs, faculty, scholarships…"
            className="flex-1 rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Search
          </button>
        </form>

        {!query ? null : results.length === 0 ? (
          <EmptyState
            title={`No published results found for "${query}".`}
            description="Only published content is searchable — draft or unapproved content never appears here."
          />
        ) : (
          <ul className="flex flex-col gap-3" aria-label={`Search results for ${query}`}>
            {results.map((result, index) => (
              <li key={`${result.type}-${result.title}-${index}`}>
                <Card className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                    {result.type}
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
        )}
      </div>
    </PublicPageShell>
  );
}
