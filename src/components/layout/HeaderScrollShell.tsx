"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Tracks page scroll and exposes it as a `data-scrolled` attribute on the `<header>` it
 * renders — plain class toggling via CSS `data-[scrolled=true]:` / `group-data-[scrolled=true]:`
 * variants, no layout measured or animated via JS. `children` must be plain server-rendered
 * JSX (this wraps a Server Component tree — PublicHeader — so children can never be a
 * function: React Server Components cannot pass functions across the server/client
 * boundary, only serializable props and rendered elements).
 */
export function HeaderScrollShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 12);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      className="group sticky top-0 z-40 border-b border-transparent bg-[var(--pub-cream)] transition-[background-color,border-color,box-shadow] duration-[var(--pub-duration-base)] ease-[var(--pub-ease)] data-[scrolled=true]:border-[var(--pub-border)] data-[scrolled=true]:bg-[var(--pub-cream)]/90 data-[scrolled=true]:shadow-[var(--pub-shadow-sm)] data-[scrolled=true]:backdrop-blur-md"
    >
      {children}
    </header>
  );
}
