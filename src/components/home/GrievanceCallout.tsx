import { CTAButton } from "@/components/public/CTAButton";
import { PublicContainer } from "@/components/public/Container";

/**
 * A static callout, not a data-driven list — see the original file's note, which still
 * applies unchanged. Restyled only (public visual language instead of the shared admin
 * Card/Button).
 */
export function GrievanceCallout() {
  return (
    <section aria-labelledby="grievance-heading" className="bg-[var(--pub-cream)]">
      <PublicContainer size="wide">
        <div className="flex flex-col items-start gap-4 rounded-[var(--pub-radius-lg)] border border-[var(--pub-border)] bg-[var(--pub-surface-alt)] px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div>
            <h2 id="grievance-heading" className="pub-font-display text-xl font-medium text-[var(--pub-ink)] sm:text-2xl">
              Have a concern?
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--pub-ink-soft)]">
              Submit a grievance confidentially — it is never published or shown to anyone
              other than authorized staff reviewing it.
            </p>
          </div>
          <CTAButton href="/grievance" variant="primary" className="shrink-0">
            Submit a grievance
          </CTAButton>
        </div>
      </PublicContainer>
    </section>
  );
}
