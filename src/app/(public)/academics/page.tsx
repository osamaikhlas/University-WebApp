import type { Metadata } from "next";
import { DataTable } from "@/components/ui/Table";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import {
  getAcademicCalendar,
  getDepartments,
  getPrograms,
  getTimetables,
} from "@/lib/content";

// Always render per-request: this page reads live, publish-gated content from the
// database (CLAUDE.md rule 4), so a stale statically-prerendered build must never be
// served here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Academics",
};

function hasPlaceholder(rows: { isPlaceholder: boolean }[]): boolean {
  return rows.some((row) => row.isPlaceholder);
}

export default async function AcademicsPage() {
  const [departments, programs, calendar, timetables] = await Promise.all([
    getDepartments(),
    getPrograms(),
    getAcademicCalendar(),
    getTimetables(),
  ]);

  return (
    <PublicPageShell
      title="Academics"
      description="Departments, programs, the academic calendar, and timetables."
    >
      <div className="flex flex-col gap-10">
        <section aria-labelledby="departments-heading" className="flex flex-col gap-3">
          <h2 id="departments-heading" className="text-lg font-semibold">
            Departments
          </h2>
          {hasPlaceholder(departments) ? <DemoDataNotice /> : null}
          <DataTable
            caption="Departments"
            rows={departments}
            getRowKey={(row) => row.id}
            emptyState={{ title: "No departments have been published yet." }}
            columns={[
              { key: "name", header: "Department", render: (row) => row.name },
              {
                key: "description",
                header: "Description",
                render: (row) => row.description ?? "—",
              },
            ]}
          />
        </section>

        <section aria-labelledby="programs-heading" className="flex flex-col gap-3">
          <h2 id="programs-heading" className="text-lg font-semibold">
            Programs
          </h2>
          {hasPlaceholder(programs) ? <DemoDataNotice /> : null}
          <DataTable
            caption="Programs offered"
            rows={programs}
            getRowKey={(row) => row.id}
            emptyState={{ title: "No programs have been published yet." }}
            columns={[
              { key: "name", header: "Program", render: (row) => row.name },
              { key: "department", header: "Department", render: (row) => row.department.name },
              { key: "level", header: "Level", render: (row) => row.level.replace(/_/g, " ") },
              {
                key: "duration",
                header: "Duration",
                render: (row) => `${row.durationYears} yr${row.durationYears === 1 ? "" : "s"}`,
                align: "right",
              },
            ]}
          />
        </section>

        <section aria-labelledby="calendar-heading" className="flex flex-col gap-3">
          <h2 id="calendar-heading" className="text-lg font-semibold">
            Academic Calendar
          </h2>
          {hasPlaceholder(calendar) ? <DemoDataNotice /> : null}
          <DataTable
            caption="Academic calendar"
            rows={calendar}
            getRowKey={(row) => row.id}
            emptyState={{ title: "No academic calendar entries have been published yet." }}
            columns={[
              { key: "title", header: "Event", render: (row) => row.title },
              {
                key: "date",
                header: "Date",
                render: (row) => row.startDate.toLocaleDateString(),
              },
              { key: "year", header: "Academic year", render: (row) => row.academicYear ?? "—" },
            ]}
          />
        </section>

        <section aria-labelledby="timetables-heading" className="flex flex-col gap-3">
          <h2 id="timetables-heading" className="text-lg font-semibold">
            Timetables
          </h2>
          {hasPlaceholder(timetables) ? <DemoDataNotice /> : null}
          <DataTable
            caption="Class timetables"
            rows={timetables}
            getRowKey={(row) => row.id}
            emptyState={{ title: "No timetables have been published yet." }}
            columns={[
              { key: "program", header: "Program", render: (row) => row.program.name },
              { key: "classGroup", header: "Class / Section", render: (row) => row.classGroup },
              {
                key: "effectiveFrom",
                header: "Effective from",
                render: (row) => row.effectiveFrom.toLocaleDateString(),
              },
            ]}
          />
        </section>
      </div>
    </PublicPageShell>
  );
}
