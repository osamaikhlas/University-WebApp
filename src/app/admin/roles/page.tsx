import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/guard";
import { getRolesOverview } from "@/lib/admin/roles";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { DataTable } from "@/components/ui/Table";

export const metadata: Metadata = {
  title: "Roles",
};

export default async function RolesPage() {
  await requirePermission("roles:manage");
  const roles = await getRolesOverview();

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading
          title="Roles"
          description="Each role's permission grants — who can view, author, and publish across every content domain."
        />

        <DataTable
          caption="Roles"
          rows={roles}
          getRowKey={(row) => row.id}
          emptyState={{ title: "No roles found." }}
          columns={[
            {
              key: "name",
              header: "Role",
              render: (row) => (
                <Link href={`/admin/roles/${row.id}`} className="font-medium text-brand hover:underline">
                  {row.name}
                </Link>
              ),
            },
            { key: "description", header: "Description", render: (row) => row.description ?? "—" },
            {
              key: "permissions",
              header: "Permissions granted",
              render: (row) => `${row.permissionCount} / ${PERMISSIONS.length}`,
            },
          ]}
        />
      </div>
    </Container>
  );
}
