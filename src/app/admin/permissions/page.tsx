import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { getPermissionMatrix } from "@/lib/admin/roles";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";

export const metadata: Metadata = {
  title: "Permissions",
};

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

/**
 * A read-only, live view of the full role × permission grid (grouped by domain) — the
 * actual editing happens per-role at /admin/roles/[id] (src/app/admin/roles/actions.ts),
 * since every real edit changes one role's grants at a time; this page exists to answer the
 * complementary question ("which roles can do X"), reading the same live RolePermission
 * data so it never drifts from what /admin/roles shows.
 */
export default async function PermissionsPage() {
  await requirePermission("permissions:manage");
  const matrix = await getPermissionMatrix();
  const groups = groupByDomain(matrix.permissionKeys);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading
          title="Permissions"
          description="Which roles hold each permission, read live from the database — edit a role's grants from its own page under Roles."
        />

        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <div key={group.domain} className="overflow-x-auto rounded-md border border-border-subtle">
              <table className="w-full min-w-max border-collapse text-sm">
                <caption className="sr-only">{group.domain} permissions by role</caption>
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-alt text-left">
                    <th scope="col" className="px-3 py-2 font-semibold text-foreground">
                      {group.domain}
                    </th>
                    {matrix.roleNames.map((roleName) => (
                      <th
                        key={roleName}
                        scope="col"
                        className="px-3 py-2 text-center text-xs font-semibold whitespace-nowrap text-foreground"
                      >
                        {roleName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.keys.map((key) => (
                    <tr key={key} className="border-b border-border-subtle last:border-0">
                      <th scope="row" className="px-3 py-2 text-left font-normal text-foreground/80">
                        {key}
                      </th>
                      {matrix.roleNames.map((roleName) => (
                        <td key={roleName} className="px-3 py-2 text-center">
                          {matrix.isGranted(key, roleName) ? (
                            <span aria-label="Granted" className="text-success-foreground">
                              ✓
                            </span>
                          ) : (
                            <span aria-hidden="true" className="text-foreground/30">
                              —
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
