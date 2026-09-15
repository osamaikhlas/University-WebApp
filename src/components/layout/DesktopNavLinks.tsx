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
      <ul className="flex items-center gap-4 overflow-x-auto text-sm whitespace-nowrap text-foreground/70">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={clsx(isActive ? "font-medium text-foreground" : "hover:text-foreground")}
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
