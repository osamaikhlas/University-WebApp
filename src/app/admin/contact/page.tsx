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

export const metadata: Metadata = { title: "Contact" };

const VALID_STATUSES: ContentStatusValue[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "UPDATE_REQUIRED",
];

export default async function ContactListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.contact.view);
  const { status } = await searchParams;
  const statusFilter = VALID_STATUSES.includes(status as ContentStatusValue)
    ? (status as ContentStatusValue)
    : null;

  const college = await getPrimaryCollege();
  const contacts = college
    ? await prisma.contact.findMany({
        where: { collegeId: college.id, ...(statusFilter ? { status: statusFilter } : {}) },
        orderBy: { type: "asc" },
      })
    : [];

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.contact.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title="Contact" description="Manage published contact details." />
          {canManage ? <LinkButton href="/admin/contact/new">New contact</LinkButton> : null}
        </div>

        <StatusFilter basePath="/admin/contact" active={statusFilter ?? "ALL"} />

        <DataTable
          caption="Contact"
          rows={contacts}
          getRowKey={(row) => row.id}
          emptyState={{
            title: "No contact entries found.",
            description: canManage ? "Create the first one to get started." : undefined,
          }}
          columns={[
            {
              key: "value",
              header: "Value",
              render: (row) => (
                <Link
                  href={`/admin/contact/${row.id}`}
                  className="font-medium text-brand hover:underline"
                >
                  {row.value}
                </Link>
              ),
            },
            { key: "type", header: "Type", render: (row) => row.type },
            { key: "label", header: "Label", render: (row) => row.label ?? "—" },
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
