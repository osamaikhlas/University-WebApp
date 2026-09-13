"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with real error reporting once one is configured; logging for now so
    // failures aren't silently swallowed during development.
    console.error(error);
  }, [error]);

  return (
    <Container>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="max-w-md text-sm text-foreground/70">
          An unexpected error occurred while rendering this page. You can try again, or come
          back later.
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </Container>
  );
}
