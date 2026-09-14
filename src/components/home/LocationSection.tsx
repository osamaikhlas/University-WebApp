import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import { getLocation } from "@/lib/content";

export async function LocationSection() {
  const location = await getLocation();

  return (
    <section aria-labelledby="location-heading" className="flex flex-col gap-3">
      <HomeSectionHeader id="location-heading" title="Location" viewAllHref="/campus" />
      {!location ? (
        <EmptyState title="Location has not been published yet." />
      ) : (
        <Card>
          {location.isPlaceholder ? (
            <div className="mb-3">
              <DemoDataNotice />
            </div>
          ) : null}
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
      )}
    </section>
  );
}
