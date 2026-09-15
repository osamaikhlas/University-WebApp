import "server-only";

import { prisma } from "@/lib/prisma";
import { ROLE_PERMISSIONS, type RoleName } from "@/lib/auth/permissions";

/** Every role the permission matrix currently grants `grievances:manage` to — derived rather
 * than hard-coded so this can never drift from `src/lib/auth/permissions.ts`. */
const GRIEVANCE_MANAGER_ROLES: RoleName[] = (Object.keys(ROLE_PERMISSIONS) as RoleName[]).filter(
  (role) => ROLE_PERMISSIONS[role].includes("grievances:manage"),
);

export type GrievanceAssignee = { id: string; name: string; email: string };

/** Staff a grievance can legally be assigned to — active users holding a role with
 * `grievances:manage`, scoped to the college. Used both to populate the "Assign to" select
 * and, server-side, to re-validate a submitted assignment isn't for an ineligible user
 * (CLAUDE.md rule 5 — never trust the client's own select options). */
export async function getEligibleGrievanceAssignees(collegeId: string): Promise<GrievanceAssignee[]> {
  return prisma.user.findMany({
    where: {
      collegeId,
      status: "ACTIVE",
      roles: { some: { role: { name: { in: GRIEVANCE_MANAGER_ROLES } } } },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    distinct: ["id"],
  });
}
