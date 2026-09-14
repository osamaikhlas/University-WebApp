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

export const metadata: Metadata = { title: "Enrollment Statistics" };

const VALID_STATUSES: ContentStatusValue[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "UPDATE_REQUIRED",
];

export default async function EnrollmentStatisticsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.enrollmentStatistics.view);
  const { status } = await searchParams;
  const statusFilter = VALID_STATUSES.includes(status as ContentStatusValue)
    ? (status as ContentStatusValue)
    : null;

  const college = await getPrimaryCollege();
  const enrollmentStatistics = college
    ? await prisma.enrollmentStatistic.findMany({
        where: { collegeId: college.id, ...(statusFilter ? { status: statusFilter } : {}) },
        include: { program: true },
        orderBy: { academicYear: "desc" },
      })
    : [];

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.enrollmentStatistics.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading
            title="Enrollment Statistics"
            description="Manage per-program enrollment counts."
          />
          {canManage ? (
            <LinkButton href="/admin/enrollment-statistics/new">
              New enrollment statistic
            </LinkButton>
          ) : null}
        </div>

        <StatusFilter basePath="/admin/enrollment-statistics" active={statusFilter ?? "ALL"} />

        <DataTable
          caption="Enrollment Statistics"
          rows={enrollmentStatistics}
          getRowKey={(row) => row.id}
          emptyState={{
            title: "No enrollment statistics found.",
            description: canManage ? "Create the first one to get started." : undefined,
          }}
          columns={[
            {
              key: "academicYear",
              header: "Academic year",
              render: (row) => (
                <Link
                  href={`/admin/enrollment-statistics/${row.id}`}
                  className="font-medium text-brand hover:underline"
                >
                  {row.academicYear}
                </Link>
              ),
            },
            { key: "program", header: "Program", render: (row) => row.program.name },
            { key: "sessionType", header: "Session", render: (row) => row.sessionType ?? "—" },
            { key: "totalEnrolled", header: "Total enrolled", render: (row) => row.totalEnrolled },
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
