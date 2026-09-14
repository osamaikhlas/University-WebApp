import type { Metadata } from "next";
import { DataTable } from "@/components/ui/Table";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { getExaminations } from "@/lib/content";

// Always render per-request: this page reads live, publish-gated content from the
// database (CLAUDE.md rule 4), so a stale statically-prerendered build must never be
// served here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Examinations",
};

export default async function ExaminationsPage() {
  const examinations = await getExaminations();

  return (
    <PublicPageShell title="Examinations" description="Examination schedules and notices.">
      <div className="flex flex-col gap-4">
        {examinations.some((row) => row.isPlaceholder) ? <DemoDataNotice /> : null}
        <DataTable
          caption="Examination schedules"
          rows={examinations}
          getRowKey={(row) => row.id}
          emptyState={{ title: "No examination schedules have been published yet." }}
          columns={[
            { key: "examType", header: "Examination", render: (row) => row.examType },
            { key: "program", header: "Program", render: (row) => row.program.name },
            { key: "year", header: "Academic year", render: (row) => row.academicYear ?? "—" },
            {
              key: "schedule",
              header: "Schedule",
              render: (row) =>
                row.scheduleStartDate
                  ? `${row.scheduleStartDate.toLocaleDateString()}${
                      row.scheduleEndDate ? ` – ${row.scheduleEndDate.toLocaleDateString()}` : ""
                    }`
                  : "—",
            },
          ]}
        />
      </div>
    </PublicPageShell>
  );
}
