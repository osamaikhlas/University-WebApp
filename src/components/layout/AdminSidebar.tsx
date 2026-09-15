"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { ADMIN_NAV_LINKS } from "@/lib/navigation";
import { ADMIN_ROUTE_PERMISSIONS } from "@/lib/auth/route-permissions";
import { hasPermission, type Permission } from "@/lib/auth/permissions";

/**
 * Filters links down to what the signed-in user can access, so the UI doesn't dangle
 * links that would just bounce to /admin/unauthorized. This is a UX convenience only —
 * every page still enforces its own `requirePermission()` server-side (CLAUDE.md rule 5),
 * so hiding a link here is never the actual access-control boundary.
 *
 * A Client Component (rather than server) specifically so it can read the current
 * pathname via `usePathname()` and mark the active section — both visually and via
 * `aria-current="page"` — since with 38 links a sighted, keyboard, or screen-reader user
 * otherwise has no way to tell which section they're in from the sidebar alone.
 */
export function AdminSidebar({ permissions }: { permissions: ReadonlySet<Permission> }) {
  const pathname = usePathname();
  const visibleLinks = ADMIN_NAV_LINKS.filter((link) => {
    const required = ADMIN_ROUTE_PERMISSIONS[link.href];
    return required ? hasPermission(permissions, required) : true;
  });

  return (
    <aside className="w-full shrink-0 border-border-subtle bg-surface-muted lg:w-60 lg:border-r">
      <nav aria-label="Admin" className="p-4">
        <ul className="flex flex-col gap-1 text-sm">
          {visibleLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={clsx(
                    "block rounded-md px-3 py-1.5",
                    isActive
                      ? "bg-surface font-medium text-foreground"
                      : "text-foreground/80 hover:bg-surface hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
