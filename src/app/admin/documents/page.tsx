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

export const metadata: Metadata = { title: "Documents" };

const VALID_STATUSES: ContentStatusValue[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
];

export default async function DocumentsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.documents.view);
  const { status } = await searchParams;
  const statusFilter = VALID_STATUSES.includes(status as ContentStatusValue)
    ? (status as ContentStatusValue)
    : null;

  const college = await getPrimaryCollege();
  const documents = college
    ? await prisma.document.findMany({
        where: { collegeId: college.id, ...(statusFilter ? { status: statusFilter } : {}) },
        orderBy: { uploadedAt: "desc" },
      })
    : [];

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.documents.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title="Documents" description="Manage downloadable documents (forms, circulars, policies)." />
          {canManage ? <LinkButton href="/admin/documents/new">New document</LinkButton> : null}
        </div>

        <StatusFilter basePath="/admin/documents" active={statusFilter ?? "ALL"} />

        <DataTable
          caption="Documents"
          rows={documents}
          getRowKey={(row) => row.id}
          emptyState={{
            title: "No documents found.",
            description: canManage ? "Create the first one to get started." : undefined,
          }}
          columns={[
            {
              key: "title",
              header: "Title",
              render: (row) => (
                <Link href={`/admin/documents/${row.id}`} className="font-medium text-brand hover:underline">
                  {row.title}
                </Link>
              ),
            },
            { key: "category", header: "Category", render: (row) => row.category ?? "—" },
            {
              key: "uploadedAt",
              header: "Uploaded",
              render: (row) => row.uploadedAt.toLocaleDateString(),
            },
            { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
          ]}
        />
      </div>
    </Container>
  );
}
