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

export const metadata: Metadata = { title: "Affiliation" };

const VALID_STATUSES: ContentStatusValue[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "UPDATE_REQUIRED",
];

export default async function AffiliationListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.affiliation.view);
  const { status } = await searchParams;
  const statusFilter = VALID_STATUSES.includes(status as ContentStatusValue)
    ? (status as ContentStatusValue)
    : null;

  const college = await getPrimaryCollege();
  const affiliations = college
    ? await prisma.affiliation.findMany({
        where: { collegeId: college.id, ...(statusFilter ? { status: statusFilter } : {}) },
        include: { program: true },
        orderBy: { validFrom: "desc" },
      })
    : [];

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.affiliation.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading
            title="Affiliation"
            description="Manage university/regulatory affiliation records."
          />
          {canManage ? (
            <LinkButton href="/admin/affiliation/new">New affiliation</LinkButton>
          ) : null}
        </div>

        <StatusFilter basePath="/admin/affiliation" active={statusFilter ?? "ALL"} />

        <DataTable
          caption="Affiliation"
          rows={affiliations}
          getRowKey={(row) => row.id}
          emptyState={{
            title: "No affiliation records found.",
            description: canManage ? "Create the first one to get started." : undefined,
          }}
          columns={[
            {
              key: "universityName",
              header: "University",
              render: (row) => (
                <Link
                  href={`/admin/affiliation/${row.id}`}
                  className="font-medium text-brand hover:underline"
                >
                  {row.universityName}
                </Link>
              ),
            },
            {
              key: "program",
              header: "Program",
              render: (row) => row.program?.name ?? "College-wide",
            },
            {
              key: "validFrom",
              header: "Valid from",
              render: (row) => row.validFrom?.toLocaleDateString() ?? "—",
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
