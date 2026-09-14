/**
 * The permission matrix — the single source of truth for authorization in this system.
 *
 * `prisma/seed.ts` seeds the `Role`/`Permission`/`RolePermission` tables directly from
 * `ROLE_PERMISSIONS` below, so the database and this file can never drift. At request time,
 * `getCurrentUser()` (see `src/lib/auth/session.ts`) reads the *database* rows (roles are
 * data, not hard-coded conditionals — docs/architecture.md §4), not this constant — this
 * file only defines what the baseline grant *should* be and is re-applied by the seed.
 *
 * CLAUDE.md rule 5: every permission check in this codebase must run server-side, against
 * this data. A page hiding a link for a role it thinks lacks access is a UX nicety only —
 * see `src/lib/auth/guard.ts`'s `requirePermission`, which is the actual security boundary.
 */

export const ROLE_NAMES = [
  "SUPER_ADMIN",
  "PRINCIPAL",
  "ADMINISTRATOR",
  "EDITOR",
  "REVIEWER",
  "ADMISSION_OFFICER",
  "EXAMINATION_OFFICER",
  "FACULTY_EDITOR",
] as const;

export type RoleName = (typeof ROLE_NAMES)[number];

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  SUPER_ADMIN: "Full system access across every module — the only role with user/role/permission management plus all content authority.",
  PRINCIPAL: "Personally accountable for the college website (per the circular). Views and publishes/approves content across every domain, verifies compliance, and oversees grievances — does not author draft content directly.",
  ADMINISTRATOR: "System/back-office administration: manages users, roles, and permissions; read-only oversight of all content domains; shares grievance and compliance oversight with the Principal.",
  EDITOR: "Authors and edits draft content in the general content domain (Notices, Events, Programs, Gallery, Documents, etc.). Cannot publish its own work.",
  REVIEWER: "Reviews and publishes/rejects content submitted by Editors and domain officers, across every content domain. Does not author content.",
  ADMISSION_OFFICER: "Authors and edits Admissions-domain content (admissions, fee structures, enrollment statistics). Cannot publish its own work.",
  EXAMINATION_OFFICER: "Authors and edits Examinations-domain content (examinations, results). Cannot publish its own work.",
  FACULTY_EDITOR: "Authors and edits Faculty-domain content (faculty, staff, clubs). Cannot publish its own work.",
};

/**
 * Permission keys are `<domain>:<action>`. Domains group related admin modules so the
 * matrix stays a manageable, auditable size instead of one row per module x per CRUD verb.
 */
export const PERMISSIONS = [
  "dashboard:view",

  "content_general:view",
  "content_general:manage",
  "content_general:publish",

  "content_admissions:view",
  "content_admissions:manage",
  "content_admissions:publish",

  "content_examinations:view",
  "content_examinations:manage",
  "content_examinations:publish",

  "content_faculty:view",
  "content_faculty:manage",
  "content_faculty:publish",

  "grievances:view",
  "grievances:manage",

  "compliance:view",
  "compliance:verify",

  "users:manage",
  "roles:manage",
  "permissions:manage",

  "audit_logs:view",
  "approval_workflow:view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const PERMISSION_SET: ReadonlySet<string> = new Set(PERMISSIONS);

export function isPermission(value: string): value is Permission {
  return PERMISSION_SET.has(value);
}

/**
 * The baseline grant per role. Design rationale (see also `docs/permission-matrix.md`):
 *
 * - Separation of duties: whoever can `:manage` (author) a content domain cannot also
 *   `:publish` it — publishing requires REVIEWER, PRINCIPAL, ADMINISTRATOR (view-only), or
 *   SUPER_ADMIN, mirroring the "no self-approval" rule in docs/architecture.md §5 and
 *   CLAUDE.md rule 7 (no auto-approval by the same actor).
 * - Domain officers (ADMISSION_OFFICER / EXAMINATION_OFFICER / FACULTY_EDITOR) are scoped to
 *   exactly one content domain; EDITOR owns the general/catch-all domain.
 * - Grievance (rule 6, private-by-default) and Compliance (rule 7, human approval only)
 *   access is limited to PRINCIPAL/ADMINISTRATOR/SUPER_ADMIN — the roles with institutional
 *   accountability — not to content authors/reviewers.
 * - Only ADMINISTRATOR and SUPER_ADMIN manage users/roles/permissions.
 */
export const ROLE_PERMISSIONS: Record<RoleName, readonly Permission[]> = {
  SUPER_ADMIN: [...PERMISSIONS],

  PRINCIPAL: [
    "dashboard:view",
    "content_general:view",
    "content_general:publish",
    "content_admissions:view",
    "content_admissions:publish",
    "content_examinations:view",
    "content_examinations:publish",
    "content_faculty:view",
    "content_faculty:publish",
    "grievances:view",
    "grievances:manage",
    "compliance:view",
    "compliance:verify",
    "audit_logs:view",
    "approval_workflow:view",
  ],

  ADMINISTRATOR: [
    "dashboard:view",
    "content_general:view",
    "content_admissions:view",
    "content_examinations:view",
    "content_faculty:view",
    "grievances:view",
    "grievances:manage",
    "compliance:view",
    "compliance:verify",
    "users:manage",
    "roles:manage",
    "permissions:manage",
    "audit_logs:view",
    "approval_workflow:view",
  ],

  EDITOR: ["dashboard:view", "content_general:view", "content_general:manage"],

  REVIEWER: [
    "dashboard:view",
    "content_general:view",
    "content_general:publish",
    "content_admissions:view",
    "content_admissions:publish",
    "content_examinations:view",
    "content_examinations:publish",
    "content_faculty:view",
    "content_faculty:publish",
    "approval_workflow:view",
  ],

  ADMISSION_OFFICER: ["dashboard:view", "content_admissions:view", "content_admissions:manage"],

  EXAMINATION_OFFICER: ["dashboard:view", "content_examinations:view", "content_examinations:manage"],

  FACULTY_EDITOR: ["dashboard:view", "content_faculty:view", "content_faculty:manage"],
};

/** True if the given permission set (a user's flattened grants) includes `permission`. */
export function hasPermission(
  granted: ReadonlySet<Permission> | ReadonlySet<string>,
  permission: Permission,
): boolean {
  return granted.has(permission);
}

/** True if `granted` includes every permission in `required`. */
export function hasAllPermissions(
  granted: ReadonlySet<Permission> | ReadonlySet<string>,
  required: readonly Permission[],
): boolean {
  return required.every((permission) => granted.has(permission));
}
