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

export const metadata: Metadata = { title: "Clubs" };

const VALID_STATUSES: ContentStatusValue[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
];

export default async function ClubsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.clubs.view);
  const { status } = await searchParams;
  const statusFilter = VALID_STATUSES.includes(status as ContentStatusValue)
    ? (status as ContentStatusValue)
    : null;

  const college = await getPrimaryCollege();
  const clubs = college
    ? await prisma.club.findMany({
        where: { collegeId: college.id, ...(statusFilter ? { status: statusFilter } : {}) },
        include: { facultyAdvisor: true },
        orderBy: { name: "asc" },
      })
    : [];

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.clubs.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title="Clubs" description="Manage student clubs and their faculty advisors." />
          {canManage ? <LinkButton href="/admin/clubs/new">New club</LinkButton> : null}
        </div>

        <StatusFilter basePath="/admin/clubs" active={statusFilter ?? "ALL"} />

        <DataTable
          caption="Clubs"
          rows={clubs}
          getRowKey={(row) => row.id}
          emptyState={{
            title: "No clubs found.",
            description: canManage ? "Create the first one to get started." : undefined,
          }}
          columns={[
            {
              key: "name",
              header: "Name",
              render: (row) => (
                <Link href={`/admin/clubs/${row.id}`} className="font-medium text-brand hover:underline">
                  {row.name}
                </Link>
              ),
            },
            {
              key: "facultyAdvisor",
              header: "Faculty advisor",
              render: (row) => row.facultyAdvisor?.name ?? "—",
            },
            { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
          ]}
        />
      </div>
    </Container>
  );
}
