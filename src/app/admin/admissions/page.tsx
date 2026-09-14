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

export const metadata: Metadata = { title: "Admissions" };

const VALID_STATUSES: ContentStatusValue[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "UPDATE_REQUIRED",
];

export default async function AdmissionsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.admissions.view);
  const { status } = await searchParams;
  const statusFilter = VALID_STATUSES.includes(status as ContentStatusValue)
    ? (status as ContentStatusValue)
    : null;

  const college = await getPrimaryCollege();
  const admissions = college
    ? await prisma.admission.findMany({
        where: { collegeId: college.id, ...(statusFilter ? { status: statusFilter } : {}) },
        include: { program: true },
        orderBy: { academicYear: "desc" },
      })
    : [];

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.admissions.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading
            title="Admissions"
            description="Manage admission cycles, eligibility, and schedules."
          />
          {canManage ? (
            <LinkButton href="/admin/admissions/new">New admission cycle</LinkButton>
          ) : null}
        </div>

        <StatusFilter basePath="/admin/admissions" active={statusFilter ?? "ALL"} />

        <DataTable
          caption="Admissions"
          rows={admissions}
          getRowKey={(row) => row.id}
          emptyState={{
            title: "No admission cycles found.",
            description: canManage ? "Create the first one to get started." : undefined,
          }}
          columns={[
            {
              key: "academicYear",
              header: "Academic year",
              render: (row) => (
                <Link
                  href={`/admin/admissions/${row.id}`}
                  className="font-medium text-brand hover:underline"
                >
                  {row.academicYear}
                </Link>
              ),
            },
            { key: "program", header: "Program", render: (row) => row.program.name },
            {
              key: "applicationStartDate",
              header: "Applications open",
              render: (row) => row.applicationStartDate?.toLocaleDateString() ?? "—",
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
