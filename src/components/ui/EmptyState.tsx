import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

/**
 * Rendered instead of a list/table when a query returns zero rows — e.g. no notices have
 * been published yet. Never fabricates placeholder rows to fill the gap (CLAUDE.md rule 1);
 * this is the explicit, honest "nothing here yet" state.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-2 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-foreground/60">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </Card>
  );
}
