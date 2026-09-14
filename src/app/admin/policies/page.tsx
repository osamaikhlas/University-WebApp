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

export const metadata: Metadata = { title: "Policies" };

const VALID_STATUSES: ContentStatusValue[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "UPDATE_REQUIRED",
];

export default async function PoliciesListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.policies.view);
  const { status } = await searchParams;
  const statusFilter = VALID_STATUSES.includes(status as ContentStatusValue)
    ? (status as ContentStatusValue)
    : null;

  const college = await getPrimaryCollege();
  const policies = college
    ? await prisma.policy.findMany({
        where: { collegeId: college.id, ...(statusFilter ? { status: statusFilter } : {}) },
        orderBy: { title: "asc" },
      })
    : [];

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.policies.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title="Policies" description="Manage institutional policies." />
          {canManage ? <LinkButton href="/admin/policies/new">New policy</LinkButton> : null}
        </div>

        <StatusFilter basePath="/admin/policies" active={statusFilter ?? "ALL"} />

        <DataTable
          caption="Policies"
          rows={policies}
          getRowKey={(row) => row.id}
          emptyState={{
            title: "No policies found.",
            description: canManage ? "Create the first one to get started." : undefined,
          }}
          columns={[
            {
              key: "title",
              header: "Title",
              render: (row) => (
                <Link
                  href={`/admin/policies/${row.id}`}
                  className="font-medium text-brand hover:underline"
                >
                  {row.title}
                </Link>
              ),
            },
            { key: "category", header: "Category", render: (row) => row.category ?? "—" },
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
