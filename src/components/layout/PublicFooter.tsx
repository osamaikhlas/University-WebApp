import Link from "next/link";
import { getContacts, getLocation, getPrimaryCollege } from "@/lib/content";
import { PublicContainer } from "@/components/public/Container";

const FALLBACK_SITE_NAME = "[PLACEHOLDER] Affiliated College Portal";

/**
 * Grouped from PUBLIC_NAV_LINKS (src/lib/navigation.ts) into 5 thematic columns for the
 * footer, rather than one long undifferentiated list — every href still points at a real
 * route, nothing here links to a page that doesn't exist.
 */
const FOOTER_COLUMNS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: "College",
    links: [
      { href: "/about", label: "About" },
      { href: "/campus", label: "Campus" },
      { href: "/faculty", label: "Faculty" },
      { href: "/staff", label: "Staff" },
      { href: "/affiliation", label: "Affiliation" },
    ],
  },
  {
    title: "Academics",
    links: [
      { href: "/academics", label: "Programs & Departments" },
      { href: "/examinations", label: "Examinations" },
      { href: "/results", label: "Results" },
      { href: "/rules", label: "Rules & Regulations" },
    ],
  },
  {
    title: "Admissions",
    links: [
      { href: "/admissions", label: "Admissions" },
      { href: "/scholarships", label: "Scholarships" },
    ],
  },
  {
    title: "Student Life",
    links: [
      { href: "/events", label: "Events" },
      { href: "/gallery", label: "Gallery" },
      { href: "/student-support", label: "Student Support" },
      { href: "/grievance", label: "Grievance" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/notices", label: "Notices" },
      { href: "/downloads", label: "Downloads" },
      { href: "/search", label: "Search" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export async function PublicFooter() {
  const [college, contacts, location] = await Promise.all([
    getPrimaryCollege(),
    getContacts(),
    getLocation(),
  ]);
  const siteName = college && !college.isPlaceholder ? college.name : FALLBACK_SITE_NAME;
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-[var(--pub-navy-950)] text-[var(--pub-ink-on-navy-muted)]">
      <PublicContainer size="wide">
        <div className="grid gap-12 py-16 lg:grid-cols-[1.3fr_2fr]">
          <div className="flex flex-col gap-4">
            <Link href="/" className="pub-font-display text-xl font-medium text-[var(--pub-ink-on-navy)]">
              {siteName}
            </Link>
            <p className="max-w-sm text-sm leading-relaxed">
              Published per Shah Abdul Latif University, Khairpur, Circular No.
              I.C/SALU/KHP/-662 (04.09.2026).
            </p>
            {location ? (
              <p className="text-sm leading-relaxed">
                {location.address}
                {location.isPlaceholder ? (
                  <span className="ml-1.5 text-[var(--pub-gold-400)]">(demo)</span>
                ) : null}
              </p>
            ) : null}
            {contacts.length > 0 ? (
              <ul className="flex flex-col gap-1 text-sm">
                {contacts.slice(0, 3).map((contact) => (
                  <li key={contact.id}>
                    {contact.label ? `${contact.label}: ` : null}
                    {contact.value}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title} className="flex flex-col gap-3">
                <h2 className="text-xs font-semibold tracking-[0.12em] text-[var(--pub-ink-on-navy)] uppercase">
                  {column.title}
                </h2>
                <ul className="flex flex-col gap-2.5 text-sm">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="transition-colors hover:text-[var(--pub-ink-on-navy)]">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {siteName}. All rights reserved.
          </p>
          <p>Built for institutional transparency and public accessibility.</p>
        </div>
      </PublicContainer>
    </footer>
  );
}
