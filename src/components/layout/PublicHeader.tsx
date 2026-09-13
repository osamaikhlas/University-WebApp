import Link from "next/link";
import { PUBLIC_NAV_LINKS } from "@/lib/navigation";

export function PublicHeader() {
  return (
    <header className="border-b border-border-subtle bg-surface">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-semibold tracking-tight sm:text-base">
          [PLACEHOLDER] Affiliated College Portal
        </Link>
        <nav aria-label="Primary" className="hidden overflow-x-auto lg:block">
          <ul className="flex items-center gap-4 text-sm text-foreground/70">
            {PUBLIC_NAV_LINKS.slice(0, 8).map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/search" className="font-medium text-brand hover:underline">
                Search
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
