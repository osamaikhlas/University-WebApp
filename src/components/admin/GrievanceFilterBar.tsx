import Link from "next/link";
import { GRIEVANCE_CATEGORIES } from "@/lib/grievance-categories";
import { GRIEVANCE_STATUS_LABELS } from "@/components/admin/GrievanceStatusBadge";
import type { GrievanceStatusValue } from "@/lib/grievance-workflow";
import { Button } from "@/components/ui/Button";

const STATUS_VALUES = Object.keys(GRIEVANCE_STATUS_LABELS) as GrievanceStatusValue[];

/**
 * Search/filter bar for the grievances list — a plain GET `<form>` (no client JS required,
 * matching the public site's `/search` page) so it also works as a bookmarkable/shareable URL
 * (`?q=...&status=...&category=...`). `page` is deliberately not a field here — a new filter
 * submission always resets back to page 1, since the previous page number is almost certainly
 * wrong for the new result set.
 */
export function GrievanceFilterBar({
  basePath,
  q,
  status,
  category,
}: {
  basePath: string;
  q: string;
  status: string;
  category: string;
}) {
  const hasFilters = q || status || category;

  return (
    <form
      method="GET"
      action={basePath}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border-subtle bg-surface p-4"
      aria-label="Search and filter grievances"
    >
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <label htmlFor="grievance-q" className="text-sm font-medium">
          Search
        </label>
        <input
          id="grievance-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Reference #, subject, name…"
          className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="grievance-status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="grievance-status"
          name="status"
          defaultValue={status}
          className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {GRIEVANCE_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="grievance-category" className="text-sm font-medium">
          Category
        </label>
        <select
          id="grievance-category"
          name="category"
          defaultValue={category}
          className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {GRIEVANCE_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" variant="secondary">
        Filter
      </Button>
      {hasFilters ? (
        <Link href={basePath} className="text-sm text-brand hover:underline">
          Clear filters
        </Link>
      ) : null}
    </form>
  );
}
