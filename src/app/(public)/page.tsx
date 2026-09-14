import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { SectionSkeleton } from "@/components/ui/Skeleton";
import { Hero } from "@/components/home/Hero";
import { AnnouncementBanner } from "@/components/home/AnnouncementBanner";
import { QuickLinks } from "@/components/home/QuickLinks";
import { NoticesSection } from "@/components/home/NoticesSection";
import { EventsSection } from "@/components/home/EventsSection";
import { IntroSection } from "@/components/home/IntroSection";
import { ProgramsSection } from "@/components/home/ProgramsSection";
import { DepartmentsSection } from "@/components/home/DepartmentsSection";
import { FacilitiesSection } from "@/components/home/FacilitiesSection";
import { ActivitiesSection } from "@/components/home/ActivitiesSection";
import { SupportSection } from "@/components/home/SupportSection";
import { DocumentsSection } from "@/components/home/DocumentsSection";
import { GrievanceCallout } from "@/components/home/GrievanceCallout";
import { LocationSection } from "@/components/home/LocationSection";
import { ContactSection } from "@/components/home/ContactSection";
import { getCollegeProfile, getContacts, getLocation, getPrimaryCollege } from "@/lib/content";
import { buildCollegeJsonLd, serializeJsonLd } from "@/lib/seo";

// Always render per-request: every section below reads live, publish-gated content from the
// database (CLAUDE.md rule 4), so a stale statically-prerendered build must never be served
// here. See progress.md's Phase 4 decisions log for why this applies to every public page.
export const dynamic = "force-dynamic";

const FALLBACK_SITE_NAME = "[PLACEHOLDER] Affiliated College Portal";
const FALLBACK_DESCRIPTION =
  "Official website of an affiliated college, published per Shah Abdul Latif University, " +
  "Khairpur circular I.C/SALU/KHP/-662. Content is pending official records.";

export async function generateMetadata(): Promise<Metadata> {
  const [college, profile] = await Promise.all([getPrimaryCollege(), getCollegeProfile()]);

  const title = college && !college.isPlaceholder ? college.name : FALLBACK_SITE_NAME;
  const description =
    profile && !profile.isPlaceholder && profile.overview
      ? profile.overview.slice(0, 155)
      : FALLBACK_DESCRIPTION;

  return {
    // `{ absolute: title }` bypasses the root layout's `template: "%s | <site name>"` —
    // without it, the homepage's own title (already the site name) gets the site name
    // appended a second time (e.g. "College | College").
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: { title, description, type: "website", url: "/" },
    twitter: { card: "summary", title, description },
  };
}

export default async function HomePage() {
  const [college, contacts, location] = await Promise.all([
    getPrimaryCollege(),
    getContacts(),
    getLocation(),
  ]);
  const jsonLd = buildCollegeJsonLd(college, contacts, location);

  return (
    <>
      {jsonLd ? (
        // serializeJsonLd escapes "<" to prevent breaking out of the tag — the standard
        // Next.js pattern for embedding JSON-LD.
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      ) : null}

      <Hero />

      <Container>
        <div className="flex flex-col gap-12 py-10 sm:gap-16 sm:py-12">
          <Suspense fallback={<SectionSkeleton rows={1} />}>
            <AnnouncementBanner />
          </Suspense>

          <QuickLinks />

          <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
            <Suspense fallback={<SectionSkeleton />}>
              <NoticesSection />
            </Suspense>
            <Suspense fallback={<SectionSkeleton />}>
              <EventsSection />
            </Suspense>
          </div>

          <Suspense fallback={<SectionSkeleton />}>
            <IntroSection />
          </Suspense>

          <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
            <Suspense fallback={<SectionSkeleton />}>
              <ProgramsSection />
            </Suspense>
            <Suspense fallback={<SectionSkeleton />}>
              <DepartmentsSection />
            </Suspense>
          </div>

          <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
            <Suspense fallback={<SectionSkeleton />}>
              <FacilitiesSection />
            </Suspense>
            <Suspense fallback={<SectionSkeleton />}>
              <ActivitiesSection />
            </Suspense>
          </div>

          <Suspense fallback={<SectionSkeleton rows={4} />}>
            <SupportSection />
          </Suspense>

          <Suspense fallback={<SectionSkeleton />}>
            <DocumentsSection />
          </Suspense>

          <GrievanceCallout />

          <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
            <Suspense fallback={<SectionSkeleton />}>
              <LocationSection />
            </Suspense>
            <Suspense fallback={<SectionSkeleton />}>
              <ContactSection />
            </Suspense>
          </div>
        </div>
      </Container>
    </>
  );
}
