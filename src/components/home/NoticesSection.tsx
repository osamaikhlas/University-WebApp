import Link from "next/link";
import { SectionHeading } from "@/components/public/SectionHeading";
import { PublicDemoNotice } from "@/components/public/PublicDemoNotice";
import { PublicContainer } from "@/components/public/Container";
import { getNotices } from "@/lib/content";

const PREVIEW_COUNT = 4;

/**
 * Editorial notice list — a dated masthead-style card per notice, not an admin table.
 * There is no per-notice detail route yet (only /notices, the listing page — see
 * src/app/(public)/notices/page.tsx), so "View notice" links there rather than to a page
 * that doesn't exist; building individual notice detail pages is inner-page work tracked
 * separately (docs/public-design-system.md).
 */
export async function NoticesSection() {
  const notices = (await getNotices()).slice(0, PREVIEW_COUNT);
  if (notices.length === 0) return null;

  return (
    <section aria-labelledby="notices-heading" className="bg-[var(--pub-surface-alt)]">
      <PublicContainer size="wide">
        <div className="flex flex-col gap-8 py-[var(--pub-section-y)]">
          <SectionHeading id="notices-heading" eyebrow="Stay Informed" title="Latest notices" viewAllHref="/notices" />
          {notices.some((n) => n.isPlaceholder) ? <PublicDemoNotice /> : null}

          <ul className="grid gap-px overflow-hidden rounded-[var(--pub-radius-lg)] border border-[var(--pub-border)] bg-[var(--pub-border)] sm:grid-cols-2">
            {notices.map((notice) => {
              const date = notice.publishDate ?? notice.createdAt;
              return (
                <li key={notice.id} className="bg-[var(--pub-surface)] p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex shrink-0 flex-col items-center rounded-[var(--pub-radius-sm)] bg-[var(--pub-navy-900)] px-3 py-2 text-center text-[var(--pub-ink-on-navy)]">
                      <span className="text-lg leading-none font-semibold">
                        {date.getDate()}
                      </span>
                      <span className="text-[0.6rem] tracking-wide uppercase">
                        {date.toLocaleDateString(undefined, { month: "short" })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      {notice.category ? (
                        <p className="text-xs font-semibold tracking-wide text-[var(--pub-teal-600)] uppercase">
                          {notice.category}
                        </p>
                      ) : null}
                      <h3 className="pub-font-display mt-0.5 text-lg leading-snug font-medium text-[var(--pub-ink)]">
                        {notice.title}
                        {notice.isPlaceholder ? (
                          <span className="ml-2 align-middle text-xs font-sans font-medium text-[var(--pub-gold-600)]">
                            demo
                          </span>
                        ) : null}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-sm text-[var(--pub-ink-muted)]">{notice.body}</p>
                      <Link
                        href="/notices"
                        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--pub-navy-800)] underline decoration-1 underline-offset-4 decoration-[var(--pub-navy-800)]/30 hover:decoration-[var(--pub-navy-800)]"
                      >
                        View notice <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </PublicContainer>
    </section>
  );
}
