import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { getCollegeProfile, getPrimaryCollege } from "@/lib/content";

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
  const [college, profile] = await Promise.all([getPrimaryCollege(), getCollegeProfile()]);

  const isPlaceholder = !college || college.isPlaceholder;
  const siteName = college && !college.isPlaceholder ? college.name : FALLBACK_SITE_NAME;
  const tagline =
    profile && !profile.isPlaceholder && profile.overview ? profile.overview : FALLBACK_TAGLINE;

  return (
    <div className="border-b border-border-subtle bg-surface-muted">
      <Container>
        <div className="flex flex-col gap-4 py-10 sm:py-14">
          {isPlaceholder ? <Badge tone="placeholder">Development placeholder</Badge> : null}
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            {siteName}
          </h1>
          <p className="max-w-2xl text-sm text-foreground/70 sm:text-base">{tagline}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <LinkButton href="/admissions" variant="primary">
              Admissions
            </LinkButton>
            <LinkButton href="/notices" variant="secondary">
              Notices
            </LinkButton>
            <LinkButton href="/contact" variant="secondary">
              Contact us
            </LinkButton>
          </div>
        </div>
      </Container>
    </div>
  );
}
