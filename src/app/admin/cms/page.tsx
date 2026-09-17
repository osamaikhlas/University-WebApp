import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/guard";
import { getCmsOverview, CMS_DOMAIN_LABELS } from "@/lib/admin/cms-overview";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "CMS",
};

export default async function CmsHubPage() {
  const user = await requirePermission("content_general:view");
  const overview = await getCmsOverview(user.permissions);

  return (
    <Container>
      <div className="flex flex-col gap-8 py-10">
        <PageHeading
          title="CMS"
          description="Every content module, grouped by domain, with how much content exists and how much is currently waiting on review."
        />

        {(Object.keys(overview) as Array<keyof typeof overview>).map((domain) => {
          const modules = overview[domain];
          if (modules.length === 0) return null;

          return (
            <div key={domain} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold tracking-wide text-foreground/70 uppercase">
                {CMS_DOMAIN_LABELS[domain]}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map((module) => (
                  <Link key={module.href} href={module.href}>
                    <Card className="h-full transition-colors hover:border-brand">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-foreground">{module.label}</h3>
                        {module.pending > 0 ? (
                          <Badge tone="brand">{module.pending} pending</Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-foreground/60">
                        {module.total} {module.total === 1 ? "record" : "records"}
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Container>
  );
}
