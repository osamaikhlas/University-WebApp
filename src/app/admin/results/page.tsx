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

export const metadata: Metadata = { title: "Results" };

const VALID_STATUSES: ContentStatusValue[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "UPDATE_REQUIRED",
];

export default async function ResultsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.results.view);
  const { status } = await searchParams;
  const statusFilter = VALID_STATUSES.includes(status as ContentStatusValue)
    ? (status as ContentStatusValue)
    : null;

  const college = await getPrimaryCollege();
  const results = college
    ? await prisma.result.findMany({
        where: { collegeId: college.id, ...(statusFilter ? { status: statusFilter } : {}) },
        include: { program: true, examination: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.results.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title="Results" description="Manage examination results." />
          {canManage ? <LinkButton href="/admin/results/new">New result</LinkButton> : null}
        </div>

        <StatusFilter basePath="/admin/results" active={statusFilter ?? "ALL"} />

        <DataTable
          caption="Results"
          rows={results}
          getRowKey={(row) => row.id}
          emptyState={{
            title: "No results found.",
            description: canManage ? "Create the first one to get started." : undefined,
          }}
          columns={[
            {
              key: "examination",
              header: "Examination",
              render: (row) => (
                <Link
                  href={`/admin/results/${row.id}`}
                  className="font-medium text-brand hover:underline"
                >
                  {row.examination.examType}
                </Link>
              ),
            },
            { key: "program", header: "Program", render: (row) => row.program.name },
            {
              key: "publishDate",
              header: "Publish date",
              render: (row) => row.publishDate?.toLocaleDateString() ?? "—",
            },
            { key: "isPublic", header: "Public", render: (row) => (row.isPublic ? "Yes" : "No") },
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
