import Link from "next/link";
import { PUBLIC_NAV_LINKS } from "@/lib/navigation";

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-border-subtle bg-surface-muted">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-xs text-foreground/60">
          [PLACEHOLDER] Affiliated College Portal — official content pending. Required per
          Shah Abdul Latif University, Khairpur, Circular No. I.C/SALU/KHP/-662 (04.09.2026).
        </p>
        <nav aria-label="Site map" className="mt-6">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-foreground/70 sm:grid-cols-3 md:grid-cols-4">
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
    </footer>
  );
}
