import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import { getCollegeProfile } from "@/lib/content";

export async function IntroSection() {
  const profile = await getCollegeProfile();

  return (
    <section aria-labelledby="intro-heading" className="flex flex-col gap-3">
      <HomeSectionHeader id="intro-heading" title="About the college" viewAllHref="/about" />
      {!profile ? (
        <EmptyState title="College profile has not been published yet." />
      ) : (
        <Card>
          {profile.isPlaceholder ? (
            <div className="mb-3">
              <DemoDataNotice />
            </div>
          ) : null}
          <p className="text-sm text-foreground/70">{profile.overview ?? "Not yet provided."}</p>
          {profile.missionStatement ? (
            <p className="mt-3 text-sm text-foreground/70">
              <span className="font-medium text-foreground">Mission: </span>
              {profile.missionStatement}
            </p>
          ) : null}
        </Card>
      )}
    </section>
  );
}
