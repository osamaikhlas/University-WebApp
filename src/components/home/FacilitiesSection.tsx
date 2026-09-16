import Link from "next/link";
import { SectionHeading } from "@/components/public/SectionHeading";
import { MediaSlot, type MediaScene } from "@/components/public/MediaSlot";
import { PublicDemoNotice } from "@/components/public/PublicDemoNotice";
import { PublicContainer } from "@/components/public/Container";
import { getInfrastructureItems } from "@/lib/content";

const PREVIEW_COUNT = 5;

const CATEGORY_SCENE: Record<string, MediaScene> = {
  CLASSROOM: "students",
  LAB: "lab",
  LIBRARY: "library",
  COMPUTER_LAB: "lab",
  MOOT_COURT: "seminar",
  OFFICE: "campus",
  SPORTS: "sports",
  OTHER: "campus",
};

/**
 * Visual, gallery-driven facilities section — asymmetric tile sizing (first tile spans two
 * columns) rather than a uniform grid, with an image-scale hover on every tile.
 */
export async function FacilitiesSection() {
  const facilities = (await getInfrastructureItems()).slice(0, PREVIEW_COUNT);
  if (facilities.length === 0) return null;

  return (
    <section aria-labelledby="facilities-heading" className="bg-[var(--pub-surface-alt)]">
      <PublicContainer size="wide">
        <div className="flex flex-col gap-8 py-[var(--pub-section-y)]">
          <SectionHeading
            id="facilities-heading"
            eyebrow="Campus & Facilities"
            title="A campus built for hands-on learning."
            viewAllHref="/campus"
          />
          {facilities.some((f) => f.isPlaceholder) ? <PublicDemoNotice /> : null}

          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {facilities.map((facility, index) => (
              <li key={facility.id} className={index === 0 ? "sm:col-span-2" : ""}>
                <Link href="/campus" className="group block">
                  <MediaSlot
                    scene={CATEGORY_SCENE[facility.category] ?? "campus"}
                    caption={facility.name}
                    ratio={index === 0 ? "wide" : "video"}
                    className="transition-transform duration-[var(--pub-duration-slow)] ease-[var(--pub-ease)] group-hover:scale-[1.02]"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </PublicContainer>
    </section>
  );
}
