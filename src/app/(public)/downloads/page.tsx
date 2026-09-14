import type { Metadata } from "next";
import { DataTable } from "@/components/ui/Table";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { getDocuments } from "@/lib/content";

// Always render per-request: this page reads live, publish-gated content from the
// database (CLAUDE.md rule 4), so a stale statically-prerendered build must never be
// served here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Downloads",
};

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DownloadsPage() {
  const documents = await getDocuments();

  return (
    <PublicPageShell title="Downloads" description="Downloadable documents and forms.">
      <div className="flex flex-col gap-4">
        {documents.some((row) => row.isPlaceholder) ? <DemoDataNotice /> : null}
        <DataTable
          caption="Downloadable documents"
          rows={documents}
          getRowKey={(row) => row.id}
          emptyState={{ title: "No documents are available for download yet." }}
          columns={[
            {
              key: "title",
              header: "Document",
              render: (row) => (
                <a
                  href={row.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand hover:underline"
                >
                  {row.title}
                </a>
              ),
            },
            { key: "category", header: "Category", render: (row) => row.category ?? "—" },
            { key: "size", header: "Size", render: (row) => formatSize(row.sizeBytes), align: "right" },
            {
              key: "uploaded",
              header: "Uploaded",
              render: (row) => row.uploadedAt.toLocaleDateString(),
            },
          ]}
        />
      </div>
    </PublicPageShell>
  );
}
