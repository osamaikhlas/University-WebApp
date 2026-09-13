import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";

/**
 * Shared placeholder for every route that does not yet have real content wired up.
 *
 * Per CLAUDE.md rules 1, 13, 14: real institutional content must come from actual college
 * records, never invented. Until that data exists, every section renders this explicit,
 * clearly-marked placeholder rather than fabricated content.
 */
export function PagePlaceholder({
  title,
  description,
  circularReference,
}: {
  title: string;
  description: string;
  /** Which circular requirement item(s) this page will satisfy once built out. */
  circularReference?: string;
}) {
  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={title} description={description} />
        <Card className="border-placeholder-border bg-placeholder-bg/40">
          <div className="flex flex-col gap-2">
            <Badge tone="placeholder">Placeholder — content pending</Badge>
            <p className="text-sm text-placeholder-foreground">
              This section has not been populated with real content yet. Official college
              information must be supplied before this page can be published — see{" "}
              <code className="font-mono">CLAUDE.md</code> (rule 1: never invent official
              college information).
            </p>
            {circularReference ? (
              <p className="text-xs text-placeholder-foreground/80">
                Circular requirement: {circularReference}
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </Container>
  );
}
