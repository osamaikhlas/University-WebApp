import Link from "next/link";
import { PUBLIC_NAV_LINKS } from "@/lib/navigation";
import { getContacts, getPrimaryCollege } from "@/lib/content";

const FALLBACK_SITE_NAME = "[PLACEHOLDER] Affiliated College Portal";

export async function PublicFooter() {
  const [college, contacts] = await Promise.all([getPrimaryCollege(), getContacts()]);
  const siteName = college && !college.isPlaceholder ? college.name : FALLBACK_SITE_NAME;

  return (
    <footer className="mt-auto border-t border-border-subtle bg-surface-muted">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[2fr_1fr] lg:px-8">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-foreground/60">
            {siteName} — required per Shah Abdul Latif University, Khairpur, Circular No.
            I.C/SALU/KHP/-662 (04.09.2026).
          </p>
          <nav aria-label="Site map">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-foreground/70 sm:grid-cols-3">
              {PUBLIC_NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-foreground hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-foreground/70">Contact</h2>
          {contacts.length === 0 ? (
            <p className="text-sm text-foreground/60">
              No contact details have been published yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm text-foreground/70">
              {contacts.slice(0, 4).map((contact) => (
                <li key={contact.id}>
                  {contact.label ? `${contact.label}: ` : null}
                  {contact.value}
                  {contact.isPlaceholder ? (
                    <span className="ml-1 text-xs text-placeholder-foreground">(demo)</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
