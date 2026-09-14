import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import { getNotices } from "@/lib/content";

const PREVIEW_COUNT = 5;

export async function NoticesSection() {
  const notices = (await getNotices()).slice(0, PREVIEW_COUNT);

  return (
    <section aria-labelledby="notices-heading" className="flex flex-col gap-3">
      <HomeSectionHeader id="notices-heading" title="Latest notices" viewAllHref="/notices" />
      {notices.some((n) => n.isPlaceholder) ? <DemoDataNotice /> : null}
      {notices.length === 0 ? (
        <EmptyState title="No notices have been published yet." />
      ) : (
        <ul className="flex flex-col gap-3">
          {notices.map((notice) => (
            <li key={notice.id}>
              <Card className="p-4">
                <p className="text-sm font-medium">{notice.title}</p>
                {notice.publishDate ? (
                  <p className="mt-1 text-xs text-foreground/60">
                    {notice.publishDate.toLocaleDateString()}
                  </p>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
