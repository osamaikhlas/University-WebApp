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

export const metadata: Metadata = { title: "Fee Structures" };

const VALID_STATUSES: ContentStatusValue[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
];

export default async function FeeStructuresListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.feeStructures.view);
  const { status } = await searchParams;
  const statusFilter = VALID_STATUSES.includes(status as ContentStatusValue)
    ? (status as ContentStatusValue)
    : null;

  const college = await getPrimaryCollege();
  const feeStructures = college
    ? await prisma.feeStructure.findMany({
        where: { collegeId: college.id, ...(statusFilter ? { status: statusFilter } : {}) },
        include: { program: true },
        orderBy: { academicYear: "desc" },
      })
    : [];

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.feeStructures.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title="Fee Structures" description="Manage per-program fee amounts." />
          {canManage ? <LinkButton href="/admin/fee-structures/new">New fee structure</LinkButton> : null}
        </div>

        <StatusFilter basePath="/admin/fee-structures" active={statusFilter ?? "ALL"} />

        <DataTable
          caption="Fee Structures"
          rows={feeStructures}
          getRowKey={(row) => row.id}
          emptyState={{
            title: "No fee structures found.",
            description: canManage ? "Create the first one to get started." : undefined,
          }}
          columns={[
            {
              key: "feeType",
              header: "Fee type",
              render: (row) => (
                <Link
                  href={`/admin/fee-structures/${row.id}`}
                  className="font-medium text-brand hover:underline"
                >
                  {row.feeType}
                </Link>
              ),
            },
            { key: "program", header: "Program", render: (row) => row.program.name },
            { key: "academicYear", header: "Academic year", render: (row) => row.academicYear },
            { key: "amount", header: "Amount", render: (row) => `${row.amount.toString()} ${row.currency}` },
            { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
          ]}
        />
      </div>
    </Container>
  );
}
