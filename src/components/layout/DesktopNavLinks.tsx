"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import type { NavLink } from "@/lib/navigation";

/**
 * The `lg:`-and-up horizontal nav in PublicHeader, split into its own Client Component
 * only so it can read the current pathname via `usePathname()` and mark the active
 * section with `aria-current="page"` plus a visual distinction — otherwise nothing in
 * the header shows a visitor which section of the site they're on.
 */
export function DesktopNavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="hidden min-w-0 flex-1 lg:block">
      <ul className="flex items-center gap-6 overflow-x-auto text-sm whitespace-nowrap">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={clsx(
                  "relative inline-flex items-center py-2 font-medium tracking-wide transition-colors",
                  "after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:scale-x-0 after:bg-[var(--pub-gold-500)] after:transition-transform after:duration-[var(--pub-duration-base)] after:ease-[var(--pub-ease)] hover:after:scale-x-100",
                  isActive
                    ? "text-[var(--pub-navy-900)] after:scale-x-100"
                    : "text-[var(--pub-ink-soft)] hover:text-[var(--pub-navy-900)]",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
