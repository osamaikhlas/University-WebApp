import Link from "next/link";
import { SectionHeading } from "@/components/public/SectionHeading";
import { MediaSlot, type MediaScene } from "@/components/public/MediaSlot";
import { PublicDemoNotice } from "@/components/public/PublicDemoNotice";
import { PublicContainer } from "@/components/public/Container";
import { getGalleryPhotoMap, getInfrastructureItems } from "@/lib/content";

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

// Maps an Infrastructure record's own `name` to the Gallery photo captioned for it — kept
// explicit rather than an exact-string match against `name`, since the college content
// register specified its own gallery caption wording independently (e.g. "Computer Lab", not
// "Computer Laboratory").
const FACILITY_PHOTO_CAPTION: Record<string, string> = {
  "General Classrooms": "general classrooms",
  "Science Laboratories": "science laboratory",
  "College Library": "college library",
  "Computer Laboratory": "computer lab",
  "Administration Office": "administration office",
  "Sports Facilities": "sports facilities",
  "Auditorium / Event Space": "auditorium / event space",
};

/**
 * Visual, gallery-driven facilities section — asymmetric tile sizing (first tile spans two
 * columns) rather than a uniform grid, with an image-scale hover on every tile.
 */
export async function FacilitiesSection() {
  const [facilities, photoMap] = await Promise.all([
    getInfrastructureItems().then((items) => items.slice(0, PREVIEW_COUNT)),
    getGalleryPhotoMap(),
  ]);
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
                    photo={photoMap.get(FACILITY_PHOTO_CAPTION[facility.name] ?? facility.name.trim().toLowerCase())}
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
