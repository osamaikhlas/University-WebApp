import { Eyebrow } from "@/components/public/Eyebrow";
import { MediaSlot } from "@/components/public/MediaSlot";
import { PublicDemoNotice } from "@/components/public/PublicDemoNotice";
import { PublicContainer } from "@/components/public/Container";
import { ArrowLink } from "@/components/public/ArrowLink";
import { getCollegeProfile } from "@/lib/content";

/** A premium editorial profile section — a large portrait slot beside a pull-quote-style
 * excerpt of the Principal's message, rather than a plain profile card. */
export async function PrincipalMessageSection() {
  const profile = await getCollegeProfile();
  if (!profile || !profile.principalMessage) return null;

  return (
    <section aria-labelledby="principal-heading" className="bg-[var(--pub-cream)]">
      <PublicContainer size="wide">
        <div className="grid gap-10 py-[var(--pub-section-y)] lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16">
          <MediaSlot scene="faculty" caption={profile.principalName ?? "Principal"} ratio="square" />

          <div className="flex flex-col gap-5">
            {/* The section's accessible name (matches aria-labelledby above) — visually
                replaced by the styled Eyebrow just below, since the blockquote is this
                section's real visual focal point, not a large headline. */}
            <h2 id="principal-heading" className="sr-only">
              Principal&apos;s Message
            </h2>
            <Eyebrow>Principal&apos;s Message</Eyebrow>
            {profile.isPlaceholder ? <PublicDemoNotice /> : null}
            <blockquote className="pub-font-display border-l-2 border-[var(--pub-gold-500)] pl-6 text-xl leading-snug font-medium text-[var(--pub-ink)] sm:text-2xl">
              “{profile.principalMessage.length > 320
                ? profile.principalMessage.slice(0, 320).trimEnd() + "…"
                : profile.principalMessage}”
            </blockquote>
            <div>
              {profile.principalName ? (
                <p className="font-semibold text-[var(--pub-ink)]">{profile.principalName}</p>
              ) : null}
              <p className="text-sm text-[var(--pub-ink-muted)]">Principal</p>
            </div>
            <ArrowLink href="/about">Read the Principal&apos;s Message</ArrowLink>
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}
