import Link from "next/link";
import { ADMIN_NAV_LINKS } from "@/lib/navigation";

export function AdminSidebar() {
  return (
    <aside className="w-full shrink-0 border-border-subtle bg-surface-muted lg:w-60 lg:border-r">
      <nav aria-label="Admin" className="p-4">
        <ul className="flex flex-col gap-1 text-sm">
          {ADMIN_NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-md px-3 py-1.5 text-foreground/80 hover:bg-surface hover:text-foreground"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
