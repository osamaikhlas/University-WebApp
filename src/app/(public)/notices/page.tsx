import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { getNotices } from "@/lib/content";

// Always render per-request: this page reads live, publish-gated content from the
// database (CLAUDE.md rule 4), so a stale statically-prerendered build must never be
// served here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notices",
};

export default async function NoticesPage() {
  const notices = await getNotices();

  return (
    <PublicPageShell title="Notices" description="Official notices and announcements.">
      <div className="flex flex-col gap-4">
        {notices.some((n) => n.isPlaceholder) ? <DemoDataNotice /> : null}
        {notices.length === 0 ? (
          <EmptyState title="No notices have been published yet." />
        ) : (
          <ul className="flex flex-col gap-4">
            {notices.map((notice) => (
              <li key={notice.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-base font-semibold">{notice.title}</h2>
                    {notice.category ? <Badge tone="neutral">{notice.category}</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-foreground/70">{notice.body}</p>
                  <p className="mt-3 text-xs text-foreground/60">
                    {notice.publishDate
                      ? `Published ${notice.publishDate.toLocaleDateString()}`
                      : null}
                    {notice.expiryDate
                      ? ` · Valid until ${notice.expiryDate.toLocaleDateString()}`
                      : null}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PublicPageShell>
  );
}
