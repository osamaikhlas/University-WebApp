import type { Metadata } from "next";
import { DataTable } from "@/components/ui/Table";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { getStaffMembers } from "@/lib/content";

// Always render per-request: this page reads live, publish-gated content from the
// database (CLAUDE.md rule 4), so a stale statically-prerendered build must never be
// served here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Staff",
};

export default async function StaffPage() {
  const staff = await getStaffMembers();

  return (
    <PublicPageShell title="Staff" description="Non-teaching staff.">
      <div className="flex flex-col gap-4">
        {staff.some((row) => row.isPlaceholder) ? <DemoDataNotice /> : null}
        <DataTable
          caption="Non-teaching staff"
          rows={staff}
          getRowKey={(row) => row.id}
          emptyState={{ title: "No staff records have been published yet." }}
          columns={[
            { key: "name", header: "Name", render: (row) => row.name },
            { key: "designation", header: "Designation", render: (row) => row.designation },
            { key: "department", header: "Department", render: (row) => row.department ?? "—" },
          ]}
        />
      </div>
    </PublicPageShell>
  );
}
