import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

/**
 * A static callout, not a data-driven list — there is nothing here about a specific college
 * that could change (the grievance *mechanism* itself is fixed UI copy, same as the
 * confidentiality notice on /grievance itself). The one thing that could change, whether a
 * grievance channel exists at all, isn't modeled as content; this always links to the real,
 * working submission form at /grievance.
 */
export function GrievanceCallout() {
  return (
    <section aria-labelledby="grievance-heading">
      <Card className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="grievance-heading" className="text-lg font-semibold tracking-tight sm:text-xl">
            Have a concern?
          </h2>
          <p className="mt-1 max-w-xl text-sm text-foreground/70">
            Submit a grievance confidentially — it is never published or shown to anyone
            other than authorized staff reviewing it.
          </p>
        </div>
        <LinkButton href="/grievance" variant="primary" className="shrink-0">
          Submit a grievance
        </LinkButton>
      </Card>
    </section>
  );
}
