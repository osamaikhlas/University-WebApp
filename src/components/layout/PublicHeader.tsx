import Link from "next/link";
import { PUBLIC_NAV_LINKS } from "@/lib/navigation";
import { getPrimaryCollege } from "@/lib/content";
import { MobileNav } from "@/components/layout/MobileNav";
import { DesktopNavLinks } from "@/components/layout/DesktopNavLinks";

const FALLBACK_SITE_NAME = "[PLACEHOLDER] Affiliated College Portal";

export async function PublicHeader() {
  const college = await getPrimaryCollege();
  // Never show a placeholder college's name as if it were real (CLAUDE.md rules 1, 14).
  const siteName = college && !college.isPlaceholder ? college.name : FALLBACK_SITE_NAME;

  return (
    <header className="relative border-b border-border-subtle bg-surface">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0 text-sm font-semibold tracking-tight sm:text-base">
          {siteName}
        </Link>

        {/* min-w-0 lets this flex item actually shrink below its content's natural width,
            which is what allows overflow-x-auto below to scroll instead of forcing the
            whole header (and page) to overflow horizontally. */}
        <DesktopNavLinks
          links={PUBLIC_NAV_LINKS.filter((link) => link.href !== "/" && link.href !== "/search")}
        />

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/search"
            className="hidden text-sm font-medium text-brand hover:underline lg:inline"
          >
            Search
          </Link>
          <MobileNav links={PUBLIC_NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}
