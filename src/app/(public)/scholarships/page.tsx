import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { getScholarships } from "@/lib/content";

// Always render per-request: this page reads live, publish-gated content from the
// database (CLAUDE.md rule 4), so a stale statically-prerendered build must never be
// served here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scholarships",
};

export default async function ScholarshipsPage() {
  const scholarships = await getScholarships();

  return (
    <PublicPageShell
      title="Scholarships"
      description="Scholarships and financial assistance available to students."
    >
      <div className="flex flex-col gap-4">
        {scholarships.some((row) => row.isPlaceholder) ? <DemoDataNotice /> : null}
        {scholarships.length === 0 ? (
          <EmptyState title="No scholarships have been published yet." />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {scholarships.map((scholarship) => (
              <li key={scholarship.id}>
                <Card>
                  <h2 className="text-base font-semibold">{scholarship.name}</h2>
                  {scholarship.description ? (
                    <p className="mt-2 text-sm text-foreground/70">{scholarship.description}</p>
                  ) : null}
                  {scholarship.eligibility ? (
                    <p className="mt-2 text-xs text-foreground/60">
                      Eligibility: {scholarship.eligibility}
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
