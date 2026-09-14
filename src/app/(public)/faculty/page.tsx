import type { Metadata } from "next";
import { DataTable } from "@/components/ui/Table";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { getFacultyMembers } from "@/lib/content";

// Always render per-request: this page reads live, publish-gated content from the
// database (CLAUDE.md rule 4), so a stale statically-prerendered build must never be
// served here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Faculty",
};

export default async function FacultyPage() {
  const faculty = await getFacultyMembers();

  return (
    <PublicPageShell title="Faculty" description="Teaching faculty, by department.">
      <div className="flex flex-col gap-4">
        {faculty.some((row) => row.isPlaceholder) ? <DemoDataNotice /> : null}
        <DataTable
          caption="Faculty"
          rows={faculty}
          getRowKey={(row) => row.id}
          emptyState={{ title: "No faculty records have been published yet." }}
          columns={[
            { key: "name", header: "Name", render: (row) => row.name },
            { key: "designation", header: "Designation", render: (row) => row.designation },
            { key: "department", header: "Department", render: (row) => row.department.name },
            {
              key: "qualifications",
              header: "Qualifications",
              render: (row) => row.qualifications ?? "—",
            },
            {
              key: "contact",
              header: "Contact",
              render: (row) => row.email ?? row.phone ?? "—",
            },
          ]}
        />
      </div>
    </PublicPageShell>
  );
}
