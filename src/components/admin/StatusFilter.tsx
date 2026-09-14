import Link from "next/link";
import { clsx } from "clsx";
import type { ContentStatusValue } from "@/lib/content-workflow";

const FILTERS: { value: ContentStatusValue | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_REVIEW", label: "Pending review" },
  { value: "APPROVED", label: "Approved" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

/** Status-filter tabs for a module's list page, driven by a `?status=` query param. */
export function StatusFilter({ basePath, active }: { basePath: string; active: string }) {
  return (
    <nav aria-label="Filter by status">
      <ul className="flex flex-wrap gap-2 text-sm">
        {FILTERS.map((filter) => {
          const isActive = active === filter.value;
          return (
            <li key={filter.value}>
              <Link
                href={filter.value === "ALL" ? basePath : `${basePath}?status=${filter.value}`}
                className={clsx(
                  "inline-flex items-center rounded-full border px-3 py-1 transition-colors",
                  isActive
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-border-subtle text-foreground/70 hover:bg-surface-muted",
                )}
              >
                {filter.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
