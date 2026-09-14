import Link from "next/link";

export type Breadcrumb = { label: string; href?: string };

/**
 * `href` omitted on the final item marks it as the current page (`aria-current="page"`,
 * not a link) — the standard breadcrumb pattern. Always includes a leading "Home" link.
 */
export function Breadcrumbs({ items }: { items: Breadcrumb[] }) {
  const trail: Breadcrumb[] = [{ label: "Home", href: "/" }, ...items];

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/60">
        {trail.map((item, index) => {
          const isLast = index === trail.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {isLast || !item.href ? (
                <span aria-current={isLast ? "page" : undefined} className="text-foreground">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="hover:text-foreground hover:underline">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
