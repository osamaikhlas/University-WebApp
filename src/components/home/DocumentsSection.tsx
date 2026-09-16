import { SectionHeading } from "@/components/public/SectionHeading";
import { PublicDemoNotice } from "@/components/public/PublicDemoNotice";
import { PublicContainer } from "@/components/public/Container";
import { getDocuments } from "@/lib/content";

const PREVIEW_COUNT = 5;

export async function DocumentsSection() {
  const documents = (await getDocuments()).slice(0, PREVIEW_COUNT);
  if (documents.length === 0) return null;

  return (
    <section aria-labelledby="documents-heading" className="bg-[var(--pub-surface-alt)]">
      <PublicContainer size="wide">
        <div className="flex flex-col gap-6 py-[var(--pub-section-y-tight)]">
          <SectionHeading id="documents-heading" eyebrow="Downloads" title="Important documents" viewAllHref="/downloads" />
          {documents.some((d) => d.isPlaceholder) ? <PublicDemoNotice /> : null}

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((document) => (
              <li key={document.id}>
                <a
                  href={`/api/files/documents/${document.id}`}
                  className="group flex items-center gap-3 rounded-[var(--pub-radius-md)] border border-[var(--pub-border)] bg-[var(--pub-surface)] px-4 py-3.5 transition-colors hover:border-[var(--pub-navy-700)]"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="var(--pub-teal-600)"
                    strokeWidth="1.6"
                    className="shrink-0"
                  >
                    <path d="M6 3h9l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1Z" strokeLinejoin="round" />
                    <path d="M14 3v5h5" strokeLinejoin="round" />
                  </svg>
                  <span className="min-w-0 text-sm">
                    <span className="block truncate font-medium text-[var(--pub-ink)] group-hover:underline">
                      {document.title}
                    </span>
                    {document.category ? (
                      <span className="text-xs text-[var(--pub-ink-muted)]">{document.category}</span>
                    ) : null}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </PublicContainer>
    </section>
  );
}
