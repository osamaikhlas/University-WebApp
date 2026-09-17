import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { getRoleWithPermissions } from "@/lib/admin/roles";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { RolePermissionsForm } from "./RolePermissionsForm";

export const metadata: Metadata = { title: "Role" };

function groupByDomain(keys: readonly string[]): Array<{ domain: string; keys: string[] }> {
  const groups = new Map<string, string[]>();
  for (const key of keys) {
    const domain = key.split(":")[0];
    const list = groups.get(domain) ?? [];
    list.push(key);
    groups.set(domain, list);
  }
  return [...groups.entries()].map(([domain, domainKeys]) => ({ domain, keys: domainKeys }));
}

export default async function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("roles:manage");
  const { id } = await params;

  const role = await getRoleWithPermissions(id);
  if (!role) notFound();

  const groupedPermissions = groupByDomain(PERMISSIONS);
  const isSuperAdmin = role.name === "SUPER_ADMIN";

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={role.name} description={role.description ?? undefined} />

        <Card>
          {isSuperAdmin ? (
            <Alert tone="info">
              SUPER_ADMIN always holds every permission and can&apos;t be edited — this
              guarantees at least one role can never be locked out of the system.
            </Alert>
          ) : (
            <RolePermissionsForm
              roleId={role.id}
              groupedPermissions={groupedPermissions}
              grantedKeys={role.grantedKeys}
            />
          )}
        </Card>
      </div>
    </Container>
  );
}
