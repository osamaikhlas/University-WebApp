import Link from "next/link";
import { SectionHeading } from "@/components/public/SectionHeading";
import { PublicDemoNotice } from "@/components/public/PublicDemoNotice";
import { PublicContainer } from "@/components/public/Container";
import { getPrograms } from "@/lib/content";

const PREVIEW_COUNT = 6;

function formatLevel(level: string): string {
  return level.charAt(0) + level.slice(1).toLowerCase().replace(/_/g, " ");
}

/**
 * Editorial program listing — each program is a full-width row (name, department, level,
 * duration, Explore →), not a grid of identical cards, per the brief's explicit request to
 * avoid "a boring grid of identical cards."
 */
export async function ProgramsSection() {
  const programs = (await getPrograms()).slice(0, PREVIEW_COUNT);
  if (programs.length === 0) return null;

  return (
    <section aria-labelledby="programs-heading" className="bg-[var(--pub-surface-alt)]">
      <PublicContainer size="wide">
        <div className="flex flex-col gap-8 py-[var(--pub-section-y)]">
          <SectionHeading
            id="programs-heading"
            eyebrow="Academic Programs"
            title="Programs built for real classrooms."
            description="Teacher-education pathways spanning undergraduate and graduate study, each grounded in practical training and reflective practice."
            viewAllHref="/academics"
          />
          {programs.some((p) => p.isPlaceholder) ? <PublicDemoNotice /> : null}

          <ul className="divide-y divide-[var(--pub-border)] border-t border-[var(--pub-border)]">
            {programs.map((program, index) => (
              <li key={program.id}>
                <Link
                  href="/academics"
                  className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-6 transition-colors hover:bg-[var(--pub-navy-900)]/[0.03] sm:grid-cols-[3rem_1fr_auto_auto] sm:gap-6 sm:px-4"
                >
                  <span className="hidden pub-font-display text-lg text-[var(--pub-ink-muted)] sm:block">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="min-w-0">
                    <span className="block pub-font-display text-xl font-medium text-[var(--pub-ink)] sm:text-2xl">
                      {program.name}
                      {program.isPlaceholder ? (
                        <span className="ml-2 align-middle text-xs font-sans font-medium text-[var(--pub-gold-600)]">
                          demo
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-sm text-[var(--pub-ink-muted)]">
                      {program.department.name}
                    </span>
                  </span>

                  <span className="hidden shrink-0 flex-col items-start gap-0.5 text-sm text-[var(--pub-ink-soft)] sm:flex">
                    <span>{formatLevel(program.level)}</span>
                    <span>
                      {program.durationYears} yr{program.durationYears === 1 ? "" : "s"}
                    </span>
                  </span>

                  <span
                    aria-hidden="true"
                    className="justify-self-end text-[var(--pub-navy-800)] transition-transform duration-[var(--pub-duration-base)] ease-[var(--pub-ease)] group-hover:translate-x-1.5 motion-reduce:group-hover:translate-x-0"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </PublicContainer>
    </section>
  );
}
