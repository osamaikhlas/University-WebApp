import { Alert } from "@/components/ui/Alert";
import { getImportantAnnouncement } from "@/lib/content";

/**
 * "Important announcement" — the single most recent notice that hasn't expired
 * (getImportantAnnouncement in src/lib/content.ts). Deliberately absent (not an empty
 * state) when there is nothing current to announce, since an "announcement" section with a
 * visible "nothing to announce" message reads oddly directly under the hero — unlike list
 * sections further down the page, where an explicit empty state is the right call.
 */
export async function AnnouncementBanner() {
  const notice = await getImportantAnnouncement();
  if (!notice) return null;

  return (
    <section aria-labelledby="announcement-heading">
      <h2 id="announcement-heading" className="sr-only">
        Important announcement
      </h2>
      <Alert tone="warning" title={notice.title}>
        <p>{notice.body}</p>
        {notice.publishDate ? (
          <p className="mt-2 text-xs opacity-80">
            Published {notice.publishDate.toLocaleDateString()}
            {notice.isPlaceholder ? " · demo content" : ""}
          </p>
        ) : null}
      </Alert>
    </section>
  );
}
