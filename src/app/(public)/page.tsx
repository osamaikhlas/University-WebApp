import type { Metadata } from "next";
import { Suspense } from "react";
import { Hero } from "@/components/home/Hero";
import { AnnouncementBanner } from "@/components/home/AnnouncementBanner";
import { QuickLinks } from "@/components/home/QuickLinks";
import { IntroSection } from "@/components/home/IntroSection";
import { ProgramsSection } from "@/components/home/ProgramsSection";
import { WhyChooseUsSection } from "@/components/home/WhyChooseUsSection";
import { FacilitiesSection } from "@/components/home/FacilitiesSection";
import { StudentLifeSection } from "@/components/home/StudentLifeSection";
import { NoticesSection } from "@/components/home/NoticesSection";
import { EventsSection } from "@/components/home/EventsSection";
import { SupportSection } from "@/components/home/SupportSection";
import { PrincipalMessageSection } from "@/components/home/PrincipalMessageSection";
import { DocumentsSection } from "@/components/home/DocumentsSection";
import { GrievanceCallout } from "@/components/home/GrievanceCallout";
import { LocationSection } from "@/components/home/LocationSection";
import { CTASection } from "@/components/home/CTASection";
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
  // This page is force-dynamic, so Next never resolves this at build time — but a transient
  // DB hiccup at request time would otherwise throw here and 500 the entire page just to
  // render a <title>. Degrade to the placeholder instead, matching src/app/layout.tsx's own
  // build-time fallback for the same underlying query.
  const [college, profile] = await Promise.all([getPrimaryCollege(), getCollegeProfile()]).catch(
    () => [null, null],
  );

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

/**
 * Every section below owns its own full-bleed background band (see
 * docs/public-design-system.md's "section rhythm" — alternating cream / surface-alt / navy)
 * rather than living inside one shared max-width container, which is what makes the
 * "layered sections" composition possible. Each section is independently `Suspense`-wrapped
 * so a slow query for one section never blocks the rest of the page from streaming in.
 */
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

      <Suspense fallback={null}>
        <AnnouncementBanner />
      </Suspense>

      <QuickLinks />

      <Suspense fallback={null}>
        <IntroSection />
      </Suspense>

      <Suspense fallback={null}>
        <ProgramsSection />
      </Suspense>

      <WhyChooseUsSection />

      <Suspense fallback={null}>
        <FacilitiesSection />
      </Suspense>

      <Suspense fallback={null}>
        <StudentLifeSection />
      </Suspense>

      <Suspense fallback={null}>
        <NoticesSection />
      </Suspense>

      <Suspense fallback={null}>
        <EventsSection />
      </Suspense>

      <Suspense fallback={null}>
        <SupportSection />
      </Suspense>

      <Suspense fallback={null}>
        <PrincipalMessageSection />
      </Suspense>

      <Suspense fallback={null}>
        <DocumentsSection />
      </Suspense>

      <GrievanceCallout />

      <Suspense fallback={null}>
        <LocationSection />
      </Suspense>

      <CTASection />
    </>
  );
}
