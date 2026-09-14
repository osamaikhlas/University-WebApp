import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { getStudentSupportServices } from "@/lib/content";

// Always render per-request: this page reads live, publish-gated content from the
// database (CLAUDE.md rule 4), so a stale statically-prerendered build must never be
// served here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Student Support",
};

export default async function StudentSupportPage() {
  const services = await getStudentSupportServices();

  return (
    <PublicPageShell title="Student Support" description="Student support services.">
      <div className="flex flex-col gap-4">
        {services.some((row) => row.isPlaceholder) ? <DemoDataNotice /> : null}
        {services.length === 0 ? (
          <EmptyState title="No student support services have been published yet." />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {services.map((service) => (
              <li key={service.id}>
                <Card>
                  <h2 className="text-base font-semibold">{service.name}</h2>
                  {service.description ? (
                    <p className="mt-2 text-sm text-foreground/70">{service.description}</p>
                  ) : null}
                  {service.contactInfo ? (
                    <p className="mt-2 text-xs text-foreground/60">{service.contactInfo}</p>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PublicPageShell>
  );
}
