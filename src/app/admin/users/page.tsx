import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { ROLE_NAMES } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { assignRoleAction, removeRoleAction } from "@/app/admin/users/actions";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ roleError?: string }>;
}) {
  await requirePermission("users:manage");
  const { roleError } = await searchParams;
  const college = await getPrimaryCollege();

  const users = college
    ? await prisma.user.findMany({
        where: { collegeId: college.id },
        orderBy: { name: "asc" },
        include: { roles: { include: { role: { select: { name: true } } } } },
      })
    : [];

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading
          title="Users"
          description="Manage which roles each admin account holds. Every change is recorded in the audit log."
        />

        {roleError ? <Alert tone="danger">{roleError}</Alert> : null}

        {!college ? (
          <Alert tone="warning">No college record exists yet.</Alert>
        ) : users.length === 0 ? (
          <Alert tone="info">No user accounts exist yet.</Alert>
        ) : (
          <div className="flex flex-col gap-4">
            {users.map((user) => {
              const heldRoles = user.roles.map((r) => r.role.name).sort();
              const availableRoles = ROLE_NAMES.filter((name) => !heldRoles.includes(name));

              return (
                <Card key={user.id} data-user-card={user.email}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="text-sm text-foreground/60">{user.email}</p>
                      <Badge tone={user.status === "ACTIVE" ? "neutral" : "placeholder"}>
                        {user.status}
                      </Badge>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {heldRoles.length === 0 ? (
                          <span className="text-sm text-foreground/60">No roles assigned.</span>
                        ) : (
                          heldRoles.map((roleName) => (
                            <form key={roleName} action={removeRoleAction.bind(null, user.id)}>
                              <input type="hidden" name="roleName" value={roleName} />
                              <Button
                                type="submit"
                                variant="secondary"
                                className="!px-2 !py-1 text-xs"
                                aria-label={`Remove ${roleName} from ${user.name}`}
                              >
                                {roleName} ✕
                              </Button>
                            </form>
                          ))
                        )}
                      </div>

                      {availableRoles.length > 0 ? (
                        <form
                          action={assignRoleAction.bind(null, user.id)}
                          className="flex items-center gap-2"
                        >
                          <label htmlFor={`add-role-${user.id}`} className="sr-only">
                            Add role
                          </label>
                          <select
                            id={`add-role-${user.id}`}
                            name="roleName"
                            defaultValue=""
                            className="rounded-md border border-border-subtle bg-surface px-2 py-1 text-xs"
                          >
                            <option value="" disabled>
                              Add a role…
                            </option>
                            {availableRoles.map((roleName) => (
                              <option key={roleName} value={roleName}>
                                {roleName}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" variant="secondary" className="!px-2 !py-1 text-xs">
                            Add
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Container>
  );
}
