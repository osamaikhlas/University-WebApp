import Link from "next/link";
import { PUBLIC_NAV_LINKS } from "@/lib/navigation";
import { getPrimaryCollege } from "@/lib/content";
import { MobileNav } from "@/components/layout/MobileNav";
import { DesktopNavLinks } from "@/components/layout/DesktopNavLinks";
import { HeaderScrollShell } from "@/components/layout/HeaderScrollShell";
import { PublicContainer } from "@/components/public/Container";
import { CTAButton } from "@/components/public/CTAButton";

const FALLBACK_SITE_NAME = "[PLACEHOLDER] Affiliated College Portal";

const UTILITY_LINKS = [
  { href: "/admissions", label: "Admissions" },
  { href: "/student-support", label: "Student Services" },
  { href: "/contact", label: "Contact" },
];

export async function PublicHeader() {
  const college = await getPrimaryCollege();
  // Never show a placeholder college's name as if it were real (CLAUDE.md rules 1, 14).
  const siteName = college && !college.isPlaceholder ? college.name : FALLBACK_SITE_NAME;
  const shortName = siteName.length > 42 ? siteName.slice(0, 39).trimEnd() + "…" : siteName;

  return (
    <HeaderScrollShell>
      {/* Utility bar — kept light and out of the way; collapses once the header goes
          compact-on-scroll (`group-data-[scrolled=true]:hidden`, set by HeaderScrollShell's
          `data-scrolled` on the ancestor <header>) so the sticky header doesn't keep
          growing on small viewports. */}
      <div className="hidden border-b border-[var(--pub-border)]/70 group-data-[scrolled=true]:hidden lg:block">
        <PublicContainer size="wide">
          <div className="flex h-9 items-center justify-between text-xs text-[var(--pub-ink-muted)]">
            <span className="tracking-wide">Official Website</span>
            <nav aria-label="Utility" className="flex items-center gap-5">
              {UTILITY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="tracking-wide transition-colors hover:text-[var(--pub-navy-900)]"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/search"
                aria-label="Search the site"
                className="inline-flex items-center gap-1.5 tracking-wide transition-colors hover:text-[var(--pub-navy-900)]"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="8.5" cy="8.5" r="5.5" />
                  <path d="M17 17l-3.5-3.5" strokeLinecap="round" />
                </svg>
                Search
              </Link>
            </nav>
          </div>
        </PublicContainer>
      </div>

      {/* Main navigation */}
      <PublicContainer size="wide">
        <div className="flex items-center gap-6 py-5 transition-[padding] duration-[var(--pub-duration-base)] group-data-[scrolled=true]:py-3">
          <Link
            href="/"
            className="group/logo flex min-w-0 shrink-0 items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--pub-gold-500)]"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--pub-navy-900)] pub-font-display text-sm text-[var(--pub-ink-on-navy)]"
            >
              {shortName.charAt(0)}
            </span>
            <span className="min-w-0">
              <span className="block truncate pub-font-display text-base leading-tight font-medium text-[var(--pub-ink)] sm:text-lg">
                {shortName}
              </span>
              <span className="hidden text-[0.65rem] tracking-[0.14em] text-[var(--pub-ink-muted)] uppercase sm:block">
                Affiliated Degree College
              </span>
            </span>
          </Link>

          <DesktopNavLinks
            links={PUBLIC_NAV_LINKS.filter((link) => link.href !== "/" && link.href !== "/search")}
          />

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <Link
              href="/search"
              aria-label="Search the site"
              className="hidden rounded-full p-2 text-[var(--pub-ink-soft)] transition-colors hover:bg-[var(--pub-navy-900)]/5 hover:text-[var(--pub-navy-900)] lg:inline-flex"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="M17 17l-3.5-3.5" strokeLinecap="round" />
              </svg>
            </Link>
            {/* Wrapped, not passed directly as CTAButton's className — see SectionHeading's
                comment on why an unprefixed `hidden` override can't reliably beat a
                component's own hardcoded `inline-flex` base class. */}
            <span className="hidden sm:inline-flex">
              <CTAButton href="/admissions" className="!px-4 !py-2 text-xs">
                Admissions
              </CTAButton>
            </span>
            <MobileNav links={PUBLIC_NAV_LINKS} />
          </div>
        </div>
      </PublicContainer>
    </HeaderScrollShell>
  );
}
