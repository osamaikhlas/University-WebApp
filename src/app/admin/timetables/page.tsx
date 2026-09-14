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

export const metadata: Metadata = { title: "Timetables" };

const VALID_STATUSES: ContentStatusValue[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "UPDATE_REQUIRED",
];

export default async function TimetablesListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.timetables.view);
  const { status } = await searchParams;
  const statusFilter = VALID_STATUSES.includes(status as ContentStatusValue)
    ? (status as ContentStatusValue)
    : null;

  const college = await getPrimaryCollege();
  const timetables = college
    ? await prisma.timetable.findMany({
        where: { collegeId: college.id, ...(statusFilter ? { status: statusFilter } : {}) },
        include: { program: true },
        orderBy: { effectiveFrom: "desc" },
      })
    : [];

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.timetables.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading
            title="Timetables"
            description="Manage class-wise/program-wise timetables."
          />
          {canManage ? <LinkButton href="/admin/timetables/new">New timetable</LinkButton> : null}
        </div>

        <StatusFilter basePath="/admin/timetables" active={statusFilter ?? "ALL"} />

        <DataTable
          caption="Timetables"
          rows={timetables}
          getRowKey={(row) => row.id}
          emptyState={{
            title: "No timetables found.",
            description: canManage ? "Create the first one to get started." : undefined,
          }}
          columns={[
            {
              key: "classGroup",
              header: "Class / Section",
              render: (row) => (
                <Link
                  href={`/admin/timetables/${row.id}`}
                  className="font-medium text-brand hover:underline"
                >
                  {row.classGroup}
                </Link>
              ),
            },
            { key: "program", header: "Program", render: (row) => row.program.name },
            {
              key: "effectiveFrom",
              header: "Effective from",
              render: (row) => row.effectiveFrom.toLocaleDateString(),
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <StatusBadge status={row.status} />,
            },
          ]}
        />
      </div>
    </Container>
  );
}
