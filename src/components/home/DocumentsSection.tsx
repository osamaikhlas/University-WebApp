import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import { getDocuments } from "@/lib/content";

const PREVIEW_COUNT = 5;

export async function DocumentsSection() {
  const documents = (await getDocuments()).slice(0, PREVIEW_COUNT);

  return (
    <section aria-labelledby="documents-heading" className="flex flex-col gap-3">
      <HomeSectionHeader id="documents-heading" title="Important documents" viewAllHref="/downloads" />
      {documents.some((d) => d.isPlaceholder) ? <DemoDataNotice /> : null}
      {documents.length === 0 ? (
        <EmptyState title="No documents are available for download yet." />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-border-subtle">
            {documents.map((document) => (
              <li key={document.id} className="p-4">
                <a
                  href={`/api/files/documents/${document.id}`}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  {document.title}
                </a>
                {document.category ? (
                  <span className="ml-2 text-xs text-foreground/60">{document.category}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
