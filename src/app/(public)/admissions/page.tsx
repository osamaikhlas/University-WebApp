import type { Metadata } from "next";
import { DataTable } from "@/components/ui/Table";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { getAdmissions, getEnrollmentStatistics, getFeeStructures } from "@/lib/content";

// Always render per-request: this page reads live, publish-gated content from the
// database (CLAUDE.md rule 4), so a stale statically-prerendered build must never be
// served here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admissions",
};

function hasPlaceholder(rows: { isPlaceholder: boolean }[]): boolean {
  return rows.some((row) => row.isPlaceholder);
}

function formatDateRange(start: Date | null, end: Date | null): string {
  if (!start && !end) return "—";
  if (start && end) return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
  return (start ?? end)!.toLocaleDateString();
}

export default async function AdmissionsPage() {
  const [admissions, feeStructures, enrollmentStats] = await Promise.all([
    getAdmissions(),
    getFeeStructures(),
    getEnrollmentStatistics(),
  ]);

  return (
    <PublicPageShell
      title="Admissions"
      description="Admission cycles, eligibility, fees, and enrollment statistics."
    >
      <div className="flex flex-col gap-10">
        <section aria-labelledby="admission-cycles-heading" className="flex flex-col gap-3">
          <h2 id="admission-cycles-heading" className="text-lg font-semibold">
            Admission cycles
          </h2>
          {hasPlaceholder(admissions) ? <DemoDataNotice /> : null}
          <DataTable
            caption="Admission cycles"
            rows={admissions}
            getRowKey={(row) => row.id}
            emptyState={{ title: "No admission cycles have been published yet." }}
            columns={[
              { key: "program", header: "Program", render: (row) => row.program.name },
              { key: "year", header: "Academic year", render: (row) => row.academicYear },
              {
                key: "eligibility",
                header: "Eligibility",
                render: (row) => row.eligibilityCriteria ?? "—",
              },
              {
                key: "window",
                header: "Application window",
                render: (row) =>
                  formatDateRange(row.applicationStartDate, row.applicationEndDate),
              },
            ]}
          />
        </section>

        <section aria-labelledby="fees-heading" className="flex flex-col gap-3">
          <h2 id="fees-heading" className="text-lg font-semibold">
            Fee structure
          </h2>
          {hasPlaceholder(feeStructures) ? <DemoDataNotice /> : null}
          <DataTable
            caption="Fee structure"
            rows={feeStructures}
            getRowKey={(row) => row.id}
            emptyState={{ title: "No fee structures have been published yet." }}
            columns={[
              { key: "program", header: "Program", render: (row) => row.program.name },
              { key: "year", header: "Academic year", render: (row) => row.academicYear },
              { key: "feeType", header: "Fee type", render: (row) => row.feeType },
              {
                key: "amount",
                header: "Amount",
                render: (row) => `${row.currency} ${row.amount.toString()}`,
                align: "right",
              },
            ]}
          />
        </section>

        <section aria-labelledby="enrollment-heading" className="flex flex-col gap-3">
          <h2 id="enrollment-heading" className="text-lg font-semibold">
            Enrollment statistics
          </h2>
          {hasPlaceholder(enrollmentStats) ? <DemoDataNotice /> : null}
          <DataTable
            caption="Enrollment statistics"
            rows={enrollmentStats}
            getRowKey={(row) => row.id}
            emptyState={{ title: "No enrollment statistics have been published yet." }}
            columns={[
              { key: "program", header: "Program", render: (row) => row.program.name },
              { key: "year", header: "Academic year", render: (row) => row.academicYear },
              { key: "session", header: "Session", render: (row) => row.sessionType ?? "—" },
              {
                key: "total",
                header: "Total enrolled",
                render: (row) => row.totalEnrolled.toLocaleString(),
                align: "right",
              },
            ]}
          />
        </section>
      </div>
    </PublicPageShell>
  );
}
