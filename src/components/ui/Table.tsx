import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Right-align numeric/date-like columns. */
  align?: "left" | "right";
};

/**
 * Generic accessible data table: a real `<table>` (not styled `<div>`s, so screen readers
 * get row/column semantics for free), wrapped in a horizontally-scrollable container so
 * wide tables never force the page itself to scroll sideways on small screens. Falls back
 * to `emptyState` instead of rendering a table with a caption and no rows.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowKey,
  emptyState,
}: {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyState: { title: string; description?: string };
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyState.title} description={emptyState.description} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border-subtle">
      <table className="w-full min-w-max text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface-muted text-xs font-medium uppercase tracking-wide text-foreground/60">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={
                  column.align === "right" ? "px-4 py-3 text-right" : "px-4 py-3 text-left"
                }
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="bg-surface">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={
                    column.align === "right" ? "px-4 py-3 text-right" : "px-4 py-3"
                  }
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
