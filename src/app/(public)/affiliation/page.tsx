import type { Metadata } from "next";
import { DataTable } from "@/components/ui/Table";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { getAffiliations } from "@/lib/content";

// Always render per-request: this page reads live, publish-gated content from the
// database (CLAUDE.md rule 4), so a stale statically-prerendered build must never be
// served here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Affiliation",
};

export default async function AffiliationPage() {
  const affiliations = await getAffiliations();

  return (
    <PublicPageShell
      title="Affiliation"
      description="Regulatory and university affiliation status."
    >
      <div className="flex flex-col gap-4">
        {affiliations.some((row) => row.isPlaceholder) ? <DemoDataNotice /> : null}
        <DataTable
          caption="Affiliation status"
          rows={affiliations}
          getRowKey={(row) => row.id}
          emptyState={{ title: "No affiliation records have been published yet." }}
          columns={[
            { key: "university", header: "Affiliating body", render: (row) => row.universityName },
            { key: "program", header: "Program", render: (row) => row.program?.name ?? "College-wide" },
            {
              key: "number",
              header: "Affiliation no.",
              render: (row) => row.affiliationNumber ?? "—",
            },
            {
              key: "validity",
              header: "Valid",
              render: (row) =>
                row.validFrom
                  ? `${row.validFrom.toLocaleDateString()}${
                      row.validTo ? ` – ${row.validTo.toLocaleDateString()}` : " – present"
                    }`
                  : "—",
            },
          ]}
        />
      </div>
    </PublicPageShell>
  );
}
