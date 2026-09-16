import Link from "next/link";
import { SectionHeading } from "@/components/public/SectionHeading";
import { PublicDemoNotice } from "@/components/public/PublicDemoNotice";
import { PublicContainer } from "@/components/public/Container";
import { getScholarships, getStudentSupportServices } from "@/lib/content";

const PREVIEW_COUNT = 4;

export async function SupportSection() {
  const [scholarships, services] = await Promise.all([
    getScholarships(),
    getStudentSupportServices(),
  ]);
  const scholarshipPreview = scholarships.slice(0, PREVIEW_COUNT);
  const servicePreview = services.slice(0, PREVIEW_COUNT);
  if (scholarshipPreview.length === 0 && servicePreview.length === 0) return null;

  const anyPlaceholder = [...scholarshipPreview, ...servicePreview].some((r) => r.isPlaceholder);

  return (
    <section aria-labelledby="support-heading" className="bg-[var(--pub-surface-alt)]">
      <PublicContainer size="wide">
        <div className="flex flex-col gap-10 py-[var(--pub-section-y)]">
          <SectionHeading
            id="support-heading"
            eyebrow="Student Support"
            title="Support that helps students succeed."
            description="Financial assistance and academic support designed to remove barriers, not add them."
          />
          {anyPlaceholder ? <PublicDemoNotice /> : null}

          <div className="grid gap-10 border-t border-[var(--pub-border)] pt-10 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="pub-font-display text-xl font-medium text-[var(--pub-ink)]">Scholarships</h3>
                <Link href="/scholarships" className="text-sm font-semibold text-[var(--pub-navy-800)] hover:underline">
                  View all
                </Link>
              </div>
              {scholarshipPreview.length === 0 ? (
                <p className="text-sm text-[var(--pub-ink-muted)]">No scholarships have been published yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-[var(--pub-border)]">
                  {scholarshipPreview.map((scholarship) => (
                    <li key={scholarship.id} className="py-4 first:pt-0">
                      <p className="font-medium text-[var(--pub-ink)]">
                        {scholarship.name}
                        {scholarship.isPlaceholder ? (
                          <span className="ml-2 text-xs font-medium text-[var(--pub-gold-600)]">demo</span>
                        ) : null}
                      </p>
                      {scholarship.eligibility ? (
                        <p className="mt-1 text-sm text-[var(--pub-ink-muted)]">{scholarship.eligibility}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="pub-font-display text-xl font-medium text-[var(--pub-ink)]">Student Support</h3>
                <Link
                  href="/student-support"
                  className="text-sm font-semibold text-[var(--pub-navy-800)] hover:underline"
                >
                  View all
                </Link>
              </div>
              {servicePreview.length === 0 ? (
                <p className="text-sm text-[var(--pub-ink-muted)]">
                  No student support services have been published yet.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-[var(--pub-border)]">
                  {servicePreview.map((service) => (
                    <li key={service.id} className="py-4 first:pt-0">
                      <p className="font-medium text-[var(--pub-ink)]">
                        {service.name}
                        {service.isPlaceholder ? (
                          <span className="ml-2 text-xs font-medium text-[var(--pub-gold-600)]">demo</span>
                        ) : null}
                      </p>
                      {service.description ? (
                        <p className="mt-1 text-sm text-[var(--pub-ink-muted)]">{service.description}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}
