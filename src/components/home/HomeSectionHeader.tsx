import Link from "next/link";

/** Shared heading + optional "View all" link, used at the top of every homepage section. */
export function HomeSectionHeader({
  id,
  title,
  viewAllHref,
  viewAllLabel = "View all",
}: {
  id: string;
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 id={id} className="text-lg font-semibold tracking-tight sm:text-xl">
        {title}
      </h2>
      {viewAllHref ? (
        <Link href={viewAllHref} className="shrink-0 text-sm font-medium text-brand hover:underline">
          {viewAllLabel}
        </Link>
      ) : null}
    </div>
  );
}
