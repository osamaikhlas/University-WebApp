import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/Table";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { getInfrastructureItems, getLocation } from "@/lib/content";

// Always render per-request: this page reads live, publish-gated content from the
// database (CLAUDE.md rule 4), so a stale statically-prerendered build must never be
// served here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Campus",
};

export default async function CampusPage() {
  const [infrastructure, location] = await Promise.all([
    getInfrastructureItems(),
    getLocation(),
  ]);

  return (
    <PublicPageShell title="Campus" description="Physical infrastructure and location.">
      <div className="flex flex-col gap-10">
        <section aria-labelledby="infrastructure-heading" className="flex flex-col gap-3">
          <h2 id="infrastructure-heading" className="text-lg font-semibold">
            Infrastructure
          </h2>
          {infrastructure.some((row) => row.isPlaceholder) ? <DemoDataNotice /> : null}
          <DataTable
            caption="Campus infrastructure"
            rows={infrastructure}
            getRowKey={(row) => row.id}
            emptyState={{ title: "No infrastructure details have been published yet." }}
            columns={[
              { key: "name", header: "Facility", render: (row) => row.name },
              {
                key: "category",
                header: "Category",
                render: (row) => row.category.replace(/_/g, " "),
              },
              {
                key: "description",
                header: "Description",
                render: (row) => row.description ?? "—",
              },
            ]}
          />
        </section>

        <section aria-labelledby="location-heading" className="flex flex-col gap-3">
          <h2 id="location-heading" className="text-lg font-semibold">
            Location
          </h2>
          {location ? (
            <Card>
              {location.isPlaceholder ? <div className="mb-3"><DemoDataNotice /></div> : null}
              <p className="text-sm text-foreground/70">{location.address}</p>
              {location.mapEmbedUrl ? (
                <div className="mt-4 aspect-video w-full overflow-hidden rounded-md border border-border-subtle">
                  <iframe
                    src={location.mapEmbedUrl}
                    title="Campus location map"
                    className="h-full w-full"
                    loading="lazy"
                  />
                </div>
              ) : null}
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-foreground/60">
                Location has not been published yet.
              </p>
            </Card>
          )}
        </section>
      </div>
    </PublicPageShell>
  );
}
