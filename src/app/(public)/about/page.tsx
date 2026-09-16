import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { getCollegeProfile, getPrincipalPhoto } from "@/lib/content";

// Always render per-request: this page reads live, publish-gated content from the
// database (CLAUDE.md rule 4), so a stale statically-prerendered build must never be
// served here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About",
};

export default async function AboutPage() {
  const [profile, principalPhoto] = await Promise.all([getCollegeProfile(), getPrincipalPhoto()]);

  return (
    <PublicPageShell
      title="About"
      description="College profile, history, vision & mission, and the Principal's message."
    >
      {!profile ? (
        <EmptyState
          title="College profile has not been published yet."
          description="Circular requirement: College Profile / History / Vision & Mission / Principal's Message."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {profile.isPlaceholder ? <DemoDataNotice /> : null}

          <Card>
            <h2 className="text-lg font-semibold">College Profile</h2>
            <p className="mt-2 text-sm text-foreground/70">
              {profile.overview ?? "Not yet provided."}
            </p>
            {profile.establishedYear ? (
              <p className="mt-2 text-xs text-foreground/60">
                Established {profile.establishedYear}
              </p>
            ) : null}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold">History</h2>
            <p className="mt-2 text-sm text-foreground/70">
              {profile.history ?? "Not yet provided."}
            </p>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <h2 className="text-lg font-semibold">Vision</h2>
              <p className="mt-2 text-sm text-foreground/70">
                {profile.visionStatement ?? "Not yet provided."}
              </p>
            </Card>
            <Card>
              <h2 className="text-lg font-semibold">Mission</h2>
              <p className="mt-2 text-sm text-foreground/70">
                {profile.missionStatement ?? "Not yet provided."}
              </p>
            </Card>
          </div>

          <Card>
            <h2 className="text-lg font-semibold">Principal&apos;s Message</h2>
            <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start">
              {principalPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/files/media/${principalPhoto.id}`}
                  alt={principalPhoto.altText}
                  className="h-28 w-28 shrink-0 rounded-full object-cover"
                />
              ) : null}
              <div>
                {profile.principalName ? (
                  <p className="text-sm font-medium text-foreground">{profile.principalName}</p>
                ) : null}
                <p className="mt-2 text-sm text-foreground/70">
                  {profile.principalMessage ?? "Not yet provided."}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </PublicPageShell>
  );
}
