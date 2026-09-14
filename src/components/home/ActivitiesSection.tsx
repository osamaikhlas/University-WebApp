import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import { getActivities } from "@/lib/content";

const PREVIEW_COUNT = 4;

export async function ActivitiesSection() {
  const activities = (await getActivities()).slice(0, PREVIEW_COUNT);

  return (
    <section aria-labelledby="activities-heading" className="flex flex-col gap-3">
      <HomeSectionHeader id="activities-heading" title="Latest activities" viewAllHref="/events" />
      {activities.some((a) => a.isPlaceholder) ? <DemoDataNotice /> : null}
      {activities.length === 0 ? (
        <EmptyState title="No co-curricular activities have been published yet." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {activities.map((activity) => (
            <li key={activity.id}>
              <Card className="p-4">
                <p className="text-sm font-medium">{activity.title}</p>
                {activity.category ? (
                  <p className="mt-1 text-xs text-foreground/60">{activity.category}</p>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
