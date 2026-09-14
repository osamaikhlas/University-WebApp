import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { getActivities, getClubs, getEvents, getSeminars, getWorkshops } from "@/lib/content";

// Always render per-request: this page reads live, publish-gated content from the
// database (CLAUDE.md rule 4), so a stale statically-prerendered build must never be
// served here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Events",
};

function hasPlaceholder(rows: { isPlaceholder: boolean }[]): boolean {
  return rows.some((row) => row.isPlaceholder);
}

function EventList<T extends { id: string; isPlaceholder: boolean }>({
  rows,
  emptyMessage,
  render,
}: {
  rows: T[];
  emptyMessage: string;
  render: (row: T) => { title: string; meta: string };
}) {
  if (rows.length === 0) return <EmptyState title={emptyMessage} />;

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {rows.map((row) => {
        const { title, meta } = render(row);
        return (
          <li key={row.id}>
            <Card className="p-4">
              <p className="text-sm font-medium">{title}</p>
              <p className="mt-1 text-xs text-foreground/60">{meta}</p>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

export default async function EventsPage() {
  const [events, seminars, workshops, activities, clubs] = await Promise.all([
    getEvents(),
    getSeminars(),
    getWorkshops(),
    getActivities(),
    getClubs(),
  ]);

  const anyPlaceholder = [events, seminars, workshops, activities, clubs].some(hasPlaceholder);

  return (
    <PublicPageShell
      title="Events"
      description="Events, seminars, workshops, and co-curricular activities."
    >
      <div className="flex flex-col gap-10">
        {anyPlaceholder ? <DemoDataNotice /> : null}

        <section aria-labelledby="events-heading" className="flex flex-col gap-3">
          <h2 id="events-heading" className="text-lg font-semibold">
            Events
          </h2>
          <EventList
            rows={events}
            emptyMessage="No events have been published yet."
            render={(row) => ({
              title: row.title,
              meta: `${row.startDate.toLocaleDateString()}${row.location ? ` · ${row.location}` : ""}`,
            })}
          />
        </section>

        <section aria-labelledby="seminars-heading" className="flex flex-col gap-3">
          <h2 id="seminars-heading" className="text-lg font-semibold">
            Seminars
          </h2>
          <EventList
            rows={seminars}
            emptyMessage="No seminars have been published yet."
            render={(row) => ({
              title: row.title,
              meta: `${row.startDate.toLocaleDateString()}${row.speaker ? ` · ${row.speaker}` : ""}`,
            })}
          />
        </section>

        <section aria-labelledby="workshops-heading" className="flex flex-col gap-3">
          <h2 id="workshops-heading" className="text-lg font-semibold">
            Workshops
          </h2>
          <EventList
            rows={workshops}
            emptyMessage="No workshops have been published yet."
            render={(row) => ({
              title: row.title,
              meta: row.startDate.toLocaleDateString(),
            })}
          />
        </section>

        <section aria-labelledby="activities-heading" className="flex flex-col gap-3">
          <h2 id="activities-heading" className="text-lg font-semibold">
            Co-curricular activities
          </h2>
          <EventList
            rows={activities}
            emptyMessage="No co-curricular activities have been published yet."
            render={(row) => ({ title: row.title, meta: row.category ?? "" })}
          />
        </section>

        <section aria-labelledby="clubs-heading" className="flex flex-col gap-3">
          <h2 id="clubs-heading" className="text-lg font-semibold">
            Student clubs
          </h2>
          <EventList
            rows={clubs}
            emptyMessage="No student clubs have been published yet."
            render={(row) => ({
              title: row.name,
              meta: row.facultyAdvisor ? `Advisor: ${row.facultyAdvisor.name}` : "",
            })}
          />
        </section>
      </div>
    </PublicPageShell>
  );
}
