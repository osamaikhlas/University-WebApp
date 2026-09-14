import Link from "next/link";
import { Card } from "@/components/ui/Card";

/**
 * Pure navigation shortcuts — labels/hrefs are UI chrome, not institutional content, so
 * hardcoding them here doesn't conflict with "all content that can change must come from
 * the database": there's nothing about a specific college in this list.
 */
const QUICK_LINKS = [
  { href: "/admissions", label: "Admissions" },
  { href: "/academics", label: "Academic Programs" },
  { href: "/notices", label: "Notices" },
  { href: "/results", label: "Results" },
  { href: "/scholarships", label: "Scholarships" },
  { href: "/grievance", label: "Grievance" },
  { href: "/downloads", label: "Downloads" },
  { href: "/contact", label: "Contact" },
];

export function QuickLinks() {
  return (
    <section aria-labelledby="quick-links-heading" className="flex flex-col gap-3">
      <h2 id="quick-links-heading" className="text-lg font-semibold tracking-tight sm:text-xl">
        Quick links
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_LINKS.map((link) => (
          <li key={link.href}>
            <Card className="relative p-4 transition-colors hover:bg-surface-muted">
              <Link
                href={link.href}
                className="text-sm font-medium after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {link.label}
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
