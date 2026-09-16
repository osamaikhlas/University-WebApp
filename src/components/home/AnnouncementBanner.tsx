import { PublicContainer } from "@/components/public/Container";
import { getImportantAnnouncement } from "@/lib/content";

/**
 * "Important announcement" — the single most recent notice that hasn't expired
 * (getImportantAnnouncement in src/lib/content.ts). Deliberately absent (not an empty
 * state) when there is nothing current to announce — see the original file's note, which
 * still applies. Restyled to the public gold-accent language instead of the shared admin
 * Alert component.
 */
export async function AnnouncementBanner() {
  const notice = await getImportantAnnouncement();
  if (!notice) return null;

  return (
    <section aria-labelledby="announcement-heading" className="border-b border-[var(--pub-gold-500)]/30 bg-[var(--pub-gold-500)]/10">
      <h2 id="announcement-heading" className="sr-only">
        Important announcement
      </h2>
      <PublicContainer size="wide">
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm">
          <span className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-[var(--pub-gold-600)]">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--pub-gold-500)]" />
            {notice.title}
          </span>
          <span className="text-[var(--pub-ink-soft)]">{notice.body}</span>
          {notice.publishDate ? (
            <span className="text-xs text-[var(--pub-ink-muted)]">
              {notice.publishDate.toLocaleDateString()}
              {notice.isPlaceholder ? " · demo content" : ""}
            </span>
          ) : null}
        </div>
      </PublicContainer>
    </section>
  );
}
