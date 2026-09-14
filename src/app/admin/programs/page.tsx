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

export const metadata: Metadata = { title: "Programs" };

const VALID_STATUSES: ContentStatusValue[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
];

export default async function ProgramsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.programs.view);
  const { status } = await searchParams;
  const statusFilter = VALID_STATUSES.includes(status as ContentStatusValue)
    ? (status as ContentStatusValue)
    : null;

  const college = await getPrimaryCollege();
  const programs = college
    ? await prisma.program.findMany({
        where: { collegeId: college.id, ...(statusFilter ? { status: statusFilter } : {}) },
        include: { department: true },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.programs.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title="Programs" description="Manage academic programs/degrees offered." />
          {canManage ? <LinkButton href="/admin/programs/new">New program</LinkButton> : null}
        </div>

        <StatusFilter basePath="/admin/programs" active={statusFilter ?? "ALL"} />

        <DataTable
          caption="Programs"
          rows={programs}
          getRowKey={(row) => row.id}
          emptyState={{
            title: "No programs found.",
            description: canManage ? "Create the first one to get started." : undefined,
          }}
          columns={[
            {
              key: "name",
              header: "Name",
              render: (row) => (
                <Link href={`/admin/programs/${row.id}`} className="font-medium text-brand hover:underline">
                  {row.name}
                </Link>
              ),
            },
            { key: "department", header: "Department", render: (row) => row.department.name },
            { key: "level", header: "Level", render: (row) => row.level.replace(/_/g, " ") },
            { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
            { key: "updated", header: "Updated", render: (row) => row.updatedAt.toLocaleDateString() },
          ]}
        />
      </div>
    </Container>
  );
}
