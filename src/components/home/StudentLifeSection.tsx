import { SectionHeading } from "@/components/public/SectionHeading";
import { MediaSlot, type MediaScene } from "@/components/public/MediaSlot";
import { PublicDemoNotice } from "@/components/public/PublicDemoNotice";
import { PublicContainer } from "@/components/public/Container";
import { getActivities, getClubs } from "@/lib/content";

const PREVIEW_COUNT = 4;
const TILE_SCENES: MediaScene[] = ["students", "event", "seminar", "sports"];

/**
 * "Student Life" — activities (co-curricular events) as imagery-led tiles, plus a compact
 * list of active clubs alongside. Renamed from the original ActivitiesSection to match the
 * brief's requested section; still backed by the same getActivities() query, plus getClubs()
 * for the club list.
 */
export async function StudentLifeSection() {
  const [activities, clubs] = await Promise.all([getActivities(), getClubs()]);
  const preview = activities.slice(0, PREVIEW_COUNT);
  if (preview.length === 0 && clubs.length === 0) return null;

  const anyPlaceholder = [...preview, ...clubs].some((row) => row.isPlaceholder);

  return (
    <section aria-labelledby="student-life-heading" className="bg-[var(--pub-navy-950)]">
      <PublicContainer size="wide">
        <div className="flex flex-col gap-10 py-[var(--pub-section-y)]">
          <SectionHeading
            id="student-life-heading"
            eyebrow="Beyond the Classroom"
            title="A campus community, not just a campus."
            description="Clubs, seminars, workshops, and co-curricular activities that build leadership and connection alongside academics."
            viewAllHref="/events"
            tone="on-navy"
          />
          {anyPlaceholder ? <PublicDemoNotice className="!border-white/20 !bg-white/5 !text-[var(--pub-gold-400)]" /> : null}

          <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
            {preview.length > 0 ? (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {preview.map((activity, index) => (
                  <li key={activity.id}>
                    <MediaSlot
                      scene={TILE_SCENES[index % TILE_SCENES.length]}
                      caption={activity.title}
                      ratio="portrait"
                    />
                    {activity.category ? (
                      <p className="mt-2 text-xs font-medium tracking-wide text-[var(--pub-ink-on-navy-muted)] uppercase">
                        {activity.category}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            {clubs.length > 0 ? (
              <div>
                <h3 className="text-xs font-semibold tracking-[0.12em] text-[var(--pub-gold-400)] uppercase">
                  Student Clubs
                </h3>
                <ul className="mt-3 flex flex-col divide-y divide-white/10">
                  {clubs.slice(0, 5).map((club) => (
                    <li key={club.id} className="py-3 text-sm text-[var(--pub-ink-on-navy)]">
                      {club.name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}
