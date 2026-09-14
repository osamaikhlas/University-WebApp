import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import { getInfrastructureItems } from "@/lib/content";

const PREVIEW_COUNT = 6;

export async function FacilitiesSection() {
  const facilities = (await getInfrastructureItems()).slice(0, PREVIEW_COUNT);

  return (
    <section aria-labelledby="facilities-heading" className="flex flex-col gap-3">
      <HomeSectionHeader id="facilities-heading" title="Facilities" viewAllHref="/campus" />
      {facilities.some((f) => f.isPlaceholder) ? <DemoDataNotice /> : null}
      {facilities.length === 0 ? (
        <EmptyState title="No facilities have been published yet." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {facilities.map((facility) => (
            <li key={facility.id}>
              <Card className="p-4">
                <p className="text-sm font-medium">{facility.name}</p>
                <p className="mt-1 text-xs text-foreground/60">
                  {facility.category.replace(/_/g, " ")}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
