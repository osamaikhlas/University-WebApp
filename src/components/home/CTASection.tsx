import { Eyebrow } from "@/components/public/Eyebrow";
import { CTAButton } from "@/components/public/CTAButton";
import { PublicContainer } from "@/components/public/Container";

/** Static closing CTA — generic invitation copy, not an institutional fact, so it needs no
 * CMS backing (same reasoning as GrievanceCallout's static copy below). */
export function CTASection() {
  return (
    <section aria-labelledby="cta-heading" className="relative overflow-hidden bg-[var(--pub-navy-900)]">
      <div aria-hidden="true" className="pub-texture-dots absolute inset-0 text-white/[0.06]" />
      <PublicContainer size="wide">
        <div className="relative flex flex-col items-center gap-6 py-[var(--pub-section-y-tight)] text-center">
          <Eyebrow tone="on-navy">Take the Next Step</Eyebrow>
          <h2
            id="cta-heading"
            className="pub-font-display max-w-2xl text-3xl leading-tight font-medium text-[var(--pub-ink-on-navy)] sm:text-4xl"
          >
            Ready to begin your journey?
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            <CTAButton href="/academics" variant="primary" className="!bg-[var(--pub-gold-500)] !text-[var(--pub-navy-950)] hover:!bg-[var(--pub-gold-400)]">
              Explore Programs
            </CTAButton>
            <CTAButton href="/admissions" variant="ghost-on-navy">
              Apply for Admission
            </CTAButton>
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}
