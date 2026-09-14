import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { ADMIN_NAV_LINKS } from "@/lib/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ADMIN_ROUTE_PERMISSIONS } from "@/lib/auth/route-permissions";
import { hasPermission } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function AdminDashboardPage() {
  const user = await requirePermission("dashboard:view");

  const visibleModuleLinks = ADMIN_NAV_LINKS.filter((link) => {
    if (link.href === "/admin") return false;
    const required = ADMIN_ROUTE_PERMISSIONS[link.href];
    return required ? hasPermission(user.permissions, required) : true;
  });

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading
          title="Dashboard"
          description="Foundation scaffolding only — no real content or workflows are wired up yet. Authentication and role-based access control are implemented and enforced server-side."
        />
        <Card>
          <div className="flex flex-col gap-2">
            <Badge tone="placeholder">Development placeholder</Badge>
            <p className="text-sm text-foreground/70">
              This dashboard will eventually summarize compliance status against the 20
              circular requirements (see <code className="font-mono">docs/compliance-matrix.md</code>),
              pending approvals, and recent activity. None of that exists yet — see{" "}
              <code className="font-mono">docs/implementation-plan.md</code> for the build
              sequence.
            </p>
          </div>
        </Card>
        <div>
          <h2 className="mb-3 text-sm font-medium text-foreground/70">Admin modules</h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {visibleModuleLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm hover:bg-surface-muted"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Container>
  );
}
