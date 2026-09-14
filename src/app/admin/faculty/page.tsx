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

export const metadata: Metadata = { title: "Faculty" };

const VALID_STATUSES: ContentStatusValue[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
];

export default async function FacultyListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.faculty.view);
  const { status } = await searchParams;
  const statusFilter = VALID_STATUSES.includes(status as ContentStatusValue)
    ? (status as ContentStatusValue)
    : null;

  const college = await getPrimaryCollege();
  const facultyMembers = college
    ? await prisma.faculty.findMany({
        where: { collegeId: college.id, ...(statusFilter ? { status: statusFilter } : {}) },
        include: { department: true },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.faculty.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title="Faculty" description="Manage faculty records." />
          {canManage ? <LinkButton href="/admin/faculty/new">New faculty record</LinkButton> : null}
        </div>

        <StatusFilter basePath="/admin/faculty" active={statusFilter ?? "ALL"} />

        <DataTable
          caption="Faculty"
          rows={facultyMembers}
          getRowKey={(row) => row.id}
          emptyState={{
            title: "No faculty records found.",
            description: canManage ? "Create the first one to get started." : undefined,
          }}
          columns={[
            {
              key: "name",
              header: "Name",
              render: (row) => (
                <Link href={`/admin/faculty/${row.id}`} className="font-medium text-brand hover:underline">
                  {row.name}
                </Link>
              ),
            },
            { key: "designation", header: "Designation", render: (row) => row.designation },
            { key: "department", header: "Department", render: (row) => row.department.name },
            { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
            { key: "updated", header: "Updated", render: (row) => row.updatedAt.toLocaleDateString() },
          ]}
        />
      </div>
    </Container>
  );
}
