import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/guard";
import { hasPermission } from "@/lib/auth/permissions";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import type { ContentStatusValue } from "@/lib/content-workflow";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { LinkButton } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/Table";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusFilter } from "@/components/admin/StatusFilter";

export const metadata: Metadata = { title: "Academic Calendar" };

const VALID_STATUSES: ContentStatusValue[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
];

export default async function AcademicCalendarListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.academicCalendar.view);
  const { status } = await searchParams;
  const statusFilter = VALID_STATUSES.includes(status as ContentStatusValue)
    ? (status as ContentStatusValue)
    : null;

  const college = await getPrimaryCollege();
  const entries = college
    ? await prisma.academicCalendar.findMany({
        where: { collegeId: college.id, ...(statusFilter ? { status: statusFilter } : {}) },
        orderBy: { startDate: "desc" },
      })
    : [];

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.academicCalendar.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title="Academic Calendar" description="Manage the academic calendar." />
          {canManage ? (
            <LinkButton href="/admin/academic-calendar/new">New calendar entry</LinkButton>
          ) : null}
        </div>

        <StatusFilter basePath="/admin/academic-calendar" active={statusFilter ?? "ALL"} />

        <DataTable
          caption="Academic calendar"
          rows={entries}
          getRowKey={(row) => row.id}
          emptyState={{
            title: "No calendar entries found.",
            description: canManage ? "Create the first one to get started." : undefined,
          }}
          columns={[
            {
              key: "title",
              header: "Title",
              render: (row) => (
                <Link
                  href={`/admin/academic-calendar/${row.id}`}
                  className="font-medium text-brand hover:underline"
                >
                  {row.title}
                </Link>
              ),
            },
            { key: "startDate", header: "Date", render: (row) => row.startDate.toLocaleDateString() },
            { key: "academicYear", header: "Academic year", render: (row) => row.academicYear ?? "—" },
            { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
          ]}
        />
      </div>
    </Container>
  );
}
