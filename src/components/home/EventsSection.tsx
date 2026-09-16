import { SectionHeading } from "@/components/public/SectionHeading";
import { MediaSlot } from "@/components/public/MediaSlot";
import { PublicDemoNotice } from "@/components/public/PublicDemoNotice";
import { PublicContainer } from "@/components/public/Container";
import { getGalleryPhotoMap, getUpcomingEvents } from "@/lib/content";

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** The nearest upcoming event gets a large featured treatment; the rest are compact rows. */
export async function EventsSection() {
  const [events, photoMap] = await Promise.all([getUpcomingEvents(4), getGalleryPhotoMap()]);
  if (events.length === 0) return null;

  const [featured, ...rest] = events;
  const featuredPhoto = photoMap.get(featured.title.trim().toLowerCase());

  return (
    <section aria-labelledby="events-heading" className="bg-[var(--pub-cream)]">
      <PublicContainer size="wide">
        <div className="flex flex-col gap-8 py-[var(--pub-section-y)]">
          <SectionHeading id="events-heading" eyebrow="What's Happening" title="Upcoming events" viewAllHref="/events" />
          {events.some((e) => e.isPlaceholder) ? <PublicDemoNotice /> : null}

          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-10">
            <div>
              <MediaSlot scene="event" caption={featured.title} ratio="video" photo={featuredPhoto} />
              <p className="mt-4 text-xs font-semibold tracking-[0.1em] text-[var(--pub-teal-600)] uppercase">
                {formatDate(featured.startDate)}
                {featured.location ? ` · ${featured.location}` : ""}
              </p>
              <h3 className="pub-font-display mt-1 text-2xl font-medium text-[var(--pub-ink)]">
                {featured.title}
                {featured.isPlaceholder ? (
                  <span className="ml-2 align-middle text-xs font-sans font-medium text-[var(--pub-gold-600)]">
                    demo
                  </span>
                ) : null}
              </h3>
              {featured.description ? (
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--pub-ink-soft)]">
                  {featured.description}
                </p>
              ) : null}
            </div>

            {rest.length > 0 ? (
              <ul className="flex flex-col divide-y divide-[var(--pub-border)] border-t border-[var(--pub-border)] lg:border-t-0">
                {rest.map((event) => (
                  <li key={event.id} className="flex items-start gap-4 py-5 first:pt-0">
                    <div className="flex shrink-0 flex-col items-center rounded-[var(--pub-radius-sm)] border border-[var(--pub-border-strong)] px-2.5 py-1.5 text-center">
                      <span className="text-base leading-none font-semibold text-[var(--pub-ink)]">
                        {event.startDate.getDate()}
                      </span>
                      <span className="text-[0.6rem] tracking-wide text-[var(--pub-ink-muted)] uppercase">
                        {event.startDate.toLocaleDateString(undefined, { month: "short" })}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--pub-ink)]">{event.title}</p>
                      {event.location ? (
                        <p className="mt-0.5 text-xs text-[var(--pub-ink-muted)]">{event.location}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}
