"use client";

import { useEffect } from "react";

/**
 * Root-level error boundary — catches errors thrown by the root layout itself, which
 * `error.tsx` cannot (it renders inside the layout, so a layout error would bypass it).
 * Must render its own <html>/<body> since the root layout may be the thing that failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="max-w-md text-sm text-black/70">
          A critical error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
