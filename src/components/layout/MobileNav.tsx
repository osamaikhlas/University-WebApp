"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
        className="inline-flex items-center justify-center rounded-md p-2 text-foreground/80 hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
          "absolute inset-x-0 top-full z-20 border-b border-border-subtle bg-surface shadow-sm",
        )}
      >
        <ul className="flex flex-col divide-y divide-border-subtle px-4 py-2 sm:px-6">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                className="block py-3 text-sm font-medium text-foreground/80 hover:text-foreground"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
