"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import type { NavLink } from "@/lib/navigation";

const PANEL_ID = "mobile-nav-panel";

/**
 * Hamburger-triggered navigation panel for small screens (`lg:hidden` — see PublicHeader,
 * which renders the full horizontal nav for `lg:` and up). Not a full-screen modal: it's an
 * in-flow disclosure panel, so there's no focus trap to manage, just a toggle button with
 * `aria-expanded`/`aria-controls` and a close-on-navigate/close-on-Escape.
 */
export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={PANEL_ID}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center justify-center rounded-[var(--pub-radius-sm)] p-2 text-[var(--pub-ink)] hover:bg-[var(--pub-navy-900)]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pub-gold-500)]"
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      <nav
        id={PANEL_ID}
        aria-label="Primary"
        hidden={!open}
        className={clsx(
          "absolute inset-x-0 top-full z-20 border-b border-[var(--pub-border)] bg-[var(--pub-cream)] shadow-[var(--pub-shadow-md)]",
        )}
      >
        <ul className="flex flex-col divide-y divide-[var(--pub-border)] px-5 py-2 sm:px-8">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={clsx(
                    "block py-3.5 text-base font-medium",
                    isActive
                      ? "text-[var(--pub-navy-900)]"
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
    </div>
  );
}
