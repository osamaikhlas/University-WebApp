import { SectionHeading } from "@/components/public/SectionHeading";
import { MediaSlot } from "@/components/public/MediaSlot";
import { StatBlock } from "@/components/public/StatBlock";
import { PublicDemoNotice } from "@/components/public/PublicDemoNotice";
import { PublicContainer } from "@/components/public/Container";
import {
  getCollegeProfile,
  getEnrollmentStatistics,
  getFacultyMembers,
  getGalleryPhotoMap,
  getPrograms,
} from "@/lib/content";

/**
 * "About the College" — a visually rich split section (image + editorial copy + a stat
 * row). Every figure is derived from real published rows, never invented (project
 * instruction §5, CLAUDE.md rule 1): established year and overview from CollegeProfile,
 * program/faculty counts from their own tables, enrolled-student total summed from
 * EnrollmentStatistic. Any figure whose contributing rows are still seed data gets a
 * `(demo)` marker via StatBlock's `isPlaceholder`, and the whole section shows
 * PublicDemoNotice when any of it is placeholder content.
 */
export async function IntroSection() {
  const [profile, programs, faculty, enrollmentStats, photoMap] = await Promise.all([
    getCollegeProfile(),
    getPrograms(),
    getFacultyMembers(),
    getEnrollmentStatistics(),
    getGalleryPhotoMap(),
  ]);

  if (!profile) return null;
  const introPhoto = photoMap.get("faculty");

  const currentYear = new Date().getFullYear();
  const yearsOfEducation = profile.establishedYear ? currentYear - profile.establishedYear : null;
  const totalEnrolled = enrollmentStats.reduce((sum, row) => sum + row.totalEnrolled, 0);

  const stats = [
    yearsOfEducation !== null
      ? { value: `${yearsOfEducation}+`, label: "Years of Education", isPlaceholder: profile.isPlaceholder }
      : null,
    { value: `${programs.length}+`, label: "Academic Programs", isPlaceholder: programs.some((p) => p.isPlaceholder) },
    { value: `${faculty.length}+`, label: "Faculty Members", isPlaceholder: faculty.some((f) => f.isPlaceholder) },
    enrollmentStats.length > 0
      ? {
          value: `${totalEnrolled.toLocaleString()}+`,
          label: "Students Enrolled",
          isPlaceholder: enrollmentStats.some((e) => e.isPlaceholder),
        }
      : null,
  ].filter((s): s is { value: string; label: string; isPlaceholder: boolean } => s !== null);

  const anyPlaceholder = profile.isPlaceholder || stats.some((s) => s.isPlaceholder);

  return (
    <section aria-labelledby="intro-heading" className="bg-[var(--pub-cream)]">
      <PublicContainer size="wide">
        <div className="grid gap-12 py-[var(--pub-section-y)] lg:grid-cols-2 lg:items-center lg:gap-16">
          <MediaSlot
            scene="faculty"
            caption="Principal & faculty"
            ratio="square"
            className="order-2 lg:order-1"
            photo={introPhoto}
          />

          <div className="order-1 flex flex-col gap-6 lg:order-2">
            <SectionHeading id="intro-heading" eyebrow="About the College" title="Educating with purpose, for over a generation." />
            {anyPlaceholder ? <PublicDemoNotice /> : null}
            <p className="text-base leading-relaxed text-[var(--pub-ink-soft)]">
              {profile.overview ?? "Not yet provided."}
            </p>
            {profile.missionStatement ? (
              <p className="text-base leading-relaxed text-[var(--pub-ink-soft)]">
                <span className="font-semibold text-[var(--pub-ink)]">Our mission — </span>
                {profile.missionStatement}
              </p>
            ) : null}

            {stats.length > 0 ? (
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-[var(--pub-border)] pt-8 sm:grid-cols-4 lg:grid-cols-2">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <dt className="sr-only">{stat.label}</dt>
                    <dd>
                      <StatBlock value={stat.value} label={stat.label} isPlaceholder={stat.isPlaceholder} />
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}
