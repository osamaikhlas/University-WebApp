import { clsx } from "clsx";

/** A single pulsing placeholder block. Purely presentational — never announced by itself. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-md bg-surface-muted", className)} />;
}

/**
 * A full-page loading state (used by route `loading.tsx` files), wrapped in a live region
 * so assistive tech announces once that content is loading without reading out the
 * skeleton's meaningless placeholder shapes.
 */
export function PageLoadingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading content"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8"
    >
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-9 w-72 max-w-full" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <div className="mt-4 flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

/**
 * A single-section loading placeholder for use as a `<Suspense fallback>` around one
 * independently-streamed homepage section, rather than the whole page. Keeps a heading-sized
 * bar plus a handful of card-sized rows so the layout doesn't jump much once real content
 * arrives.
 */
export function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading section" className="flex flex-col gap-3">
      <Skeleton className="h-6 w-40" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full" />
      ))}
    </div>
  );
}
