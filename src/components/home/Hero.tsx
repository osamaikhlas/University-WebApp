import { Eyebrow } from "@/components/public/Eyebrow";
import { CTAButton } from "@/components/public/CTAButton";
import { MediaSlot } from "@/components/public/MediaSlot";
import { PublicContainer } from "@/components/public/Container";
import { getAdmissions, getCollegeProfile, getPrimaryCollege } from "@/lib/content";

const FALLBACK_SITE_NAME = "[PLACEHOLDER] Affiliated College Portal";
const FALLBACK_TAGLINE =
  "This site is being built to satisfy Shah Abdul Latif University, Khairpur Circular " +
  "No. I.C/SALU/KHP/-662 (04.09.2026), which requires every affiliated college to publish " +
  "an official website. No real college content has been supplied yet — every section " +
  "below is a placeholder until official records are provided.";

/**
 * Awaited directly by the homepage (not wrapped in Suspense) — it's the page's largest
 * above-the-fold content and the source of the <h1>, so it should render with the initial
 * HTML rather than pop in after a loading skeleton (better LCP, and search engines see the
 * heading immediately).
 */
export async function Hero() {
  const [college, profile, admissions] = await Promise.all([
    getPrimaryCollege(),
    getCollegeProfile(),
    getAdmissions(),
  ]);

  const isPlaceholder = !college || college.isPlaceholder;
  const siteName = college && !college.isPlaceholder ? college.name : FALLBACK_SITE_NAME;
  const tagline =
    profile && !profile.isPlaceholder && profile.overview ? profile.overview : FALLBACK_TAGLINE;

  const currentAdmission = admissions[0] ?? null;
  const now = new Date();
  const admissionsOpen = currentAdmission
    ? (!currentAdmission.applicationStartDate || currentAdmission.applicationStartDate <= now) &&
      (!currentAdmission.applicationEndDate || currentAdmission.applicationEndDate >= now)
    : null;

  return (
    <section className="relative overflow-hidden bg-[var(--pub-cream)]">
      <PublicContainer size="wide">
        <div className="grid items-start gap-12 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-20">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <Eyebrow>{isPlaceholder ? "Development Placeholder" : "Official Website"}</Eyebrow>
              {profile?.establishedYear ? (
                <span className="text-xs font-medium tracking-wide text-[var(--pub-ink-muted)]">
                  Est. {profile.establishedYear}
                </span>
              ) : null}
            </div>

            <h1 className="pub-font-display text-4xl leading-[1.04] font-medium tracking-tight text-[var(--pub-ink)] sm:text-6xl lg:text-[3.75rem]">
              {siteName}
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-[var(--pub-ink-soft)] sm:text-lg">
              {tagline}
            </p>

            <div className="mt-2 flex flex-wrap gap-3">
              <CTAButton href="/academics" variant="primary">
                Explore Programs
              </CTAButton>
              <CTAButton href="/admissions" variant="secondary">
                {currentAdmission ? `Admissions ${currentAdmission.academicYear}` : "Admissions"}
              </CTAButton>
            </div>
          </div>

          <div className="relative">
            <MediaSlot scene="campus" caption="Campus" ratio="square" className="lg:aspect-[4/3]" />

            {currentAdmission ? (
              <div className="absolute -top-6 right-4 left-4 sm:left-auto sm:right-8 sm:w-72">
                <div className="rounded-[var(--pub-radius-md)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-4 shadow-[var(--pub-shadow-lg)]">
                  <p className="text-xs font-semibold tracking-[0.1em] text-[var(--pub-ink-muted)] uppercase">
                    Academic Year {currentAdmission.academicYear}
                    {currentAdmission.isPlaceholder ? " · demo" : ""}
                  </p>
                  <p className="pub-font-display mt-1 text-xl font-medium text-[var(--pub-navy-900)]">
                    Admissions {admissionsOpen ? "Open" : "Closed"}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}
