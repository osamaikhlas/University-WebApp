import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import { getScholarships, getStudentSupportServices } from "@/lib/content";

const PREVIEW_COUNT = 3;

export async function SupportSection() {
  const [scholarships, services] = await Promise.all([
    getScholarships(),
    getStudentSupportServices(),
  ]);
  const scholarshipPreview = scholarships.slice(0, PREVIEW_COUNT);
  const servicePreview = services.slice(0, PREVIEW_COUNT);
  const anyPlaceholder = [...scholarshipPreview, ...servicePreview].some((r) => r.isPlaceholder);

  return (
    <section aria-labelledby="support-heading" className="flex flex-col gap-3">
      <HomeSectionHeader id="support-heading" title="Scholarships & student support" />
      {anyPlaceholder ? <DemoDataNotice /> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground/70">Scholarships</h3>
            <Link href="/scholarships" className="text-sm text-brand hover:underline">
              View all
            </Link>
          </div>
          {scholarshipPreview.length === 0 ? (
            <EmptyState title="No scholarships have been published yet." />
          ) : (
            <ul className="flex flex-col gap-3">
              {scholarshipPreview.map((scholarship) => (
                <li key={scholarship.id}>
                  <Card className="p-4">
                    <p className="text-sm font-medium">{scholarship.name}</p>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground/70">Student support</h3>
            <Link href="/student-support" className="text-sm text-brand hover:underline">
              View all
            </Link>
          </div>
          {servicePreview.length === 0 ? (
            <EmptyState title="No student support services have been published yet." />
          ) : (
            <ul className="flex flex-col gap-3">
              {servicePreview.map((service) => (
                <li key={service.id}>
                  <Card className="p-4">
                    <p className="text-sm font-medium">{service.name}</p>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
