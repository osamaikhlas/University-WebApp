"use client";

/**
 * Chromium (unlike some other browsers) scrolls to a same-page hash target on navigation
 * but does not reliably move keyboard focus there — a well-known cross-browser gap for
 * `tabindex="-1"` targets. A pure `<a href="#main-content">` alone therefore doesn't
 * actually satisfy WCAG 2.4.1 (Bypass Blocks) in Chromium: found while e2e-testing this
 * exact skip link. Explicitly focusing the target on click/activation closes that gap while
 * still degrading gracefully (the browser's native scroll-to-hash still happens) if JS is
 * unavailable.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      onClick={(event) => {
        const target = document.getElementById("main-content");
        if (!target) return;
        event.preventDefault();
        target.focus();
        target.scrollIntoView();
      }}
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-foreground"
    >
      Skip to main content
    </a>
  );
}
