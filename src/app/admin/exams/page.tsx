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

export const metadata: Metadata = { title: "Exams" };

const VALID_STATUSES: ContentStatusValue[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
];

export default async function ExaminationsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.examinations.view);
  const { status } = await searchParams;
  const statusFilter = VALID_STATUSES.includes(status as ContentStatusValue)
    ? (status as ContentStatusValue)
    : null;

  const college = await getPrimaryCollege();
  const examinations = college
    ? await prisma.examination.findMany({
        where: { collegeId: college.id, ...(statusFilter ? { status: statusFilter } : {}) },
        include: { program: true },
        orderBy: { scheduleStartDate: "desc" },
      })
    : [];

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.examinations.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title="Exams" description="Manage examination schedules and notices." />
          {canManage ? <LinkButton href="/admin/exams/new">New examination</LinkButton> : null}
        </div>

        <StatusFilter basePath="/admin/exams" active={statusFilter ?? "ALL"} />

        <DataTable
          caption="Exams"
          rows={examinations}
          getRowKey={(row) => row.id}
          emptyState={{
            title: "No examinations found.",
            description: canManage ? "Create the first one to get started." : undefined,
          }}
          columns={[
            {
              key: "examType",
              header: "Exam type",
              render: (row) => (
                <Link href={`/admin/exams/${row.id}`} className="font-medium text-brand hover:underline">
                  {row.examType}
                </Link>
              ),
            },
            { key: "program", header: "Program", render: (row) => row.program.name },
            {
              key: "scheduleStartDate",
              header: "Schedule start",
              render: (row) => row.scheduleStartDate?.toLocaleDateString() ?? "—",
            },
            { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
          ]}
        />
      </div>
    </Container>
  );
}
