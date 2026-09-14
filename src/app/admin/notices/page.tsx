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

export const metadata: Metadata = { title: "Notices" };

const VALID_STATUSES: ContentStatusValue[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "UPDATE_REQUIRED",
];

export default async function NoticesListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.notices.view);
  const { status } = await searchParams;
  const statusFilter = VALID_STATUSES.includes(status as ContentStatusValue)
    ? (status as ContentStatusValue)
    : null;

  const college = await getPrimaryCollege();
  const notices = college
    ? await prisma.notice.findMany({
        where: { collegeId: college.id, ...(statusFilter ? { status: statusFilter } : {}) },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.notices.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title="Notices" description="Author and publish college notices." />
          {canManage ? <LinkButton href="/admin/notices/new">New notice</LinkButton> : null}
        </div>

        <StatusFilter basePath="/admin/notices" active={statusFilter ?? "ALL"} />

        <DataTable
          caption="Notices"
          rows={notices}
          getRowKey={(row) => row.id}
          emptyState={{
            title: "No notices found.",
            description: canManage ? "Create the first one to get started." : undefined,
          }}
          columns={[
            {
              key: "title",
              header: "Title",
              render: (row) => (
                <Link
                  href={`/admin/notices/${row.id}`}
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
            {
              key: "updated",
              header: "Updated",
              render: (row) => row.updatedAt.toLocaleDateString(),
            },
          ]}
        />
      </div>
    </Container>
  );
}
