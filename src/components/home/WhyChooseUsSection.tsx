import type { ReactNode } from "react";
import { SectionHeading } from "@/components/public/SectionHeading";
import { PublicContainer } from "@/components/public/Container";

/**
 * Generic institutional value propositions — UI copy, not a specific factual claim about
 * this college (no numbers, no dates, nothing CLAUDE.md rule 1 would require sourcing from
 * real records), so it's fine as static design-layer content, the same way nav/footer
 * category labels are. A plain icon+title+description list rather than a boxed icon-card
 * grid, per the brief's explicit "avoid generic icon-card grids."
 */
const VALUE_PROPS: Array<{ title: string; description: string; icon: ReactNode }> = [
  {
    title: "Academic Excellence",
    description: "Rigorous, outcome-focused teacher education grounded in evidence-based practice.",
    icon: (
      <path d="M4 8l8-4 8 4-8 4-8-4Zm0 0v6c0 1.5 3.5 3 8 3s8-1.5 8-3V8" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Teacher Preparation",
    description: "Practical training and supervised teaching practice from the first semester.",
    icon: <path d="M12 4a4 4 0 100 8 4 4 0 000-8ZM5 20c1-4 4-6 7-6s6 2 7 6" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Research & Innovation",
    description: "Faculty-led inquiry into classroom practice, curriculum, and learning outcomes.",
    icon: <path d="M10 3v5.5L5 18a1 1 0 00.9 1.5h12.2a1 1 0 00.9-1.5L14 8.5V3M8.5 3h7" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Digital Learning",
    description: "Technology-integrated instruction, from blended classrooms to digital assessment.",
    icon: <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V6ZM9 20h6" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Community Engagement",
    description: "Partnerships with local schools and outreach that extend learning beyond campus.",
    icon: <path d="M17 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7ZM20 20v-1a3.5 3.5 0 00-2.5-3.36M15 4.13a3.5 3.5 0 010 6.74" strokeLinecap="round" strokeLinejoin="round" />,
  },
];

export function WhyChooseUsSection() {
  return (
    <section aria-labelledby="why-choose-heading" className="bg-[var(--pub-cream)]">
      <PublicContainer size="wide">
        <div className="grid gap-12 py-[var(--pub-section-y)] lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <SectionHeading
            id="why-choose-heading"
            eyebrow="Why Choose Us"
            title="An education built on more than a classroom."
            description="Five commitments that shape every program, every classroom, and every graduate we send into the field."
          />

          <ul className="flex flex-col divide-y divide-[var(--pub-border-strong)]">
            {VALUE_PROPS.map((item) => (
              <li key={item.title} className="flex items-start gap-5 py-6 first:pt-0 last:pb-0">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="28"
                  height="28"
                  fill="none"
                  stroke="var(--pub-teal-600)"
                  strokeWidth="1.5"
                  className="mt-0.5 shrink-0"
                >
                  {item.icon}
                </svg>
                <div>
                  <h3 className="pub-font-display text-xl font-medium text-[var(--pub-ink)]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--pub-ink-soft)] sm:text-base">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </PublicContainer>
    </section>
  );
}
