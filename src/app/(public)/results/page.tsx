import type { Metadata } from "next";
import { DataTable } from "@/components/ui/Table";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { getResults } from "@/lib/content";

// Always render per-request: this page reads live, publish-gated content from the
// database (CLAUDE.md rule 4), so a stale statically-prerendered build must never be
// served here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Results",
};

export default async function ResultsPage() {
  const results = await getResults();

  return (
    <PublicPageShell title="Results" description="Examination results.">
      <div className="flex flex-col gap-4">
        {results.some((row) => row.isPlaceholder) ? <DemoDataNotice /> : null}
        <DataTable
          caption="Examination results"
          rows={results}
          getRowKey={(row) => row.id}
          emptyState={{ title: "No results have been published yet." }}
          columns={[
            { key: "program", header: "Program", render: (row) => row.program.name },
            { key: "exam", header: "Examination", render: (row) => row.examination.examType },
            {
              key: "publishDate",
              header: "Published",
              render: (row) => row.publishDate?.toLocaleDateString() ?? "—",
            },
            {
              key: "link",
              header: "Result",
              render: (row) =>
                row.externalLink ? (
                  <a
                    href={row.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand hover:underline"
                  >
                    View result
                  </a>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      </div>
    </PublicPageShell>
  );
}
