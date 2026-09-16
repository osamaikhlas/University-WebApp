import Link from "next/link";
import { PublicContainer } from "@/components/public/Container";

/**
 * Pure navigation shortcuts — labels/hrefs are UI chrome, not institutional content (see the
 * original file's note this preserves), restyled as a dense institutional "quick access"
 * strip rather than five identical cards. `/academics` covers both Programs and Academic
 * Calendar since Phase 4 consolidated those into sections of one page (src/lib/navigation.ts).
 */
const QUICK_LINKS = [
  { href: "/academics", label: "Programs" },
  { href: "/academics", label: "Departments" },
  { href: "/admissions", label: "Admissions" },
  { href: "/academics", label: "Academic Calendar" },
  { href: "/notices", label: "Notices" },
];

export function QuickLinks() {
  return (
    <section aria-labelledby="quick-links-heading" className="border-y border-white/10 bg-[var(--pub-navy-950)]">
      <h2 id="quick-links-heading" className="sr-only">
        Quick access
      </h2>
      <PublicContainer size="wide">
        <ul className="grid grid-cols-2 divide-x divide-y divide-white/10 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
          {QUICK_LINKS.map((link, index) => (
            <li key={`${link.href}-${link.label}`} className={index === QUICK_LINKS.length - 1 && index % 2 === 0 ? "col-span-2 sm:col-span-1" : ""}>
              <Link
                href={link.href}
                className="group flex items-center justify-between gap-2 px-5 py-5 text-sm font-medium text-[var(--pub-ink-on-navy-muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--pub-ink-on-navy)] sm:px-6"
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className="text-[var(--pub-gold-400)] transition-transform duration-[var(--pub-duration-base)] ease-[var(--pub-ease)] group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </PublicContainer>
    </section>
  );
}
