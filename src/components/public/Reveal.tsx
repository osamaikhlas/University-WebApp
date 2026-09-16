"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fades/slides a section into view once it enters the viewport — subtle, one-shot, and
 * entirely inert for `prefers-reduced-motion: reduce` users (the CSS in globals.css that
 * makes `.pub-reveal` start invisible only exists inside a `no-preference` media query, so
 * reduced-motion users simply see the content immediately, observer or not). Content is
 * real server-rendered HTML underneath — this only toggles a class, never delays or hides
 * content from crawlers/no-JS clients (the un-classed fallback is fully visible).
 */
export function Reveal({
  children,
  delayMs = 0,
  className,
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`pub-reveal ${visible ? "pub-reveal-visible" : ""} ${className ?? ""}`}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
