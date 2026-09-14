import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import { getUpcomingEvents } from "@/lib/content";

export async function EventsSection() {
  const events = await getUpcomingEvents(3);

  return (
    <section aria-labelledby="events-heading" className="flex flex-col gap-3">
      <HomeSectionHeader id="events-heading" title="Upcoming events" viewAllHref="/events" />
      {events.some((e) => e.isPlaceholder) ? <DemoDataNotice /> : null}
      {events.length === 0 ? (
        <EmptyState title="No upcoming events are scheduled." />
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id}>
              <Card className="p-4">
                <p className="text-sm font-medium">{event.title}</p>
                <p className="mt-1 text-xs text-foreground/60">
                  {event.startDate.toLocaleDateString()}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
