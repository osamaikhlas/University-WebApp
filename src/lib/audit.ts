import "server-only";

import type { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * The single, centralized audit-log writer — CLAUDE.md rule 8 ("keep audit history") plus
 * this app's explicit requirement that every important action (create/update/archive,
 * submit/approve/reject/publish/unpublish, login, permission changes, compliance
 * verification, grievance status changes) is recorded, with a consistent shape, through one
 * code path rather than each module hand-rolling its own `prisma.auditLog.create()` call.
 * Every workflow engine (`content-workflow.ts`, `compliance-workflow.ts`,
 * `grievance-workflow.ts`), every plain content module's create/update action, login/logout
 * (`auth/actions.ts`), and the permission-change action (`admin/users/actions.ts`) all funnel
 * through this function — see progress.md's decisions log for the earlier, more fragmented
 * state this replaced.
 *
 * Writing is the *only* thing this module does: there is no corresponding
 * `updateAudit`/`deleteAudit`. Audit records are also immutable at the database level
 * (migration `20260916000000_audit_log_hardening` — Postgres triggers reject any UPDATE/
 * DELETE on `audit_logs` outright), so "not editable from normal CMS interfaces" holds even
 * if a future write path forgets to read this comment.
 */

/**
 * Round-trips a value through JSON so Prisma's `Json` columns get plain, storable data
 * (e.g. a Prisma row's `Date` fields become ISO strings) instead of a TypeScript type Prisma
 * can't statically verify as JSON-safe.
 */
function toJsonSnapshot(value: unknown): object | undefined {
  if (value === null || value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as object;
}

export type LogAuditParams = {
  /** The user who performed the action, or `null` for a system-generated entry (an
   * automatic status recalculation) or a genuinely unauthenticated actor (a public
   * grievance submission, a failed login against an email with no matching account). */
  actorId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  /** The record's relevant state before the action — omit if there's no meaningful "before"
   * (e.g. a brand-new record). */
  before?: unknown;
  /** The record's relevant state after the action — omit if there's no meaningful "after"
   * (e.g. a login, which doesn't mutate the entity it's recorded against). */
  after?: unknown;
  /** A human-written reason/note (e.g. a rejection reason, a resolution summary) — distinct
   * from `metadata`, which is structured, machine-oriented context. */
  comment?: string;
  /** Structured contextual detail that isn't itself a before/after field value — e.g. a
   * login's user agent, or which specific role a permission change added or removed. */
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
};

export async function logAudit(params: LogAuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeSnapshot: toJsonSnapshot(params.before),
      afterSnapshot: toJsonSnapshot(params.after),
      comment: params.comment,
      metadata: toJsonSnapshot(params.metadata),
      ipAddress: params.ipAddress ?? undefined,
    },
  });
}

export type LatestActionComment = {
  comment: string;
  actorName: string;
  createdAt: Date;
};

/**
 * Looks up the most recent audit entry for `action` on a given entity that carries a
 * comment — used to surface a reviewer's reason (e.g. a `request_update` note) back on the
 * entity's own admin page instead of leaving it discoverable only via the audit trail.
 * Returns `null` rather than throwing when none exists, since a record's history could in
 * principle not contain a matching entry (e.g. after being reset) without that being an
 * error condition worth failing the page render over.
 */
export async function getLatestActionComment(params: {
  entityType: string;
  entityId: string;
  action: AuditAction;
}): Promise<LatestActionComment | null> {
  const entry = await prisma.auditLog.findFirst({
    where: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      comment: { not: null },
    },
    orderBy: { createdAt: "desc" },
    include: { actor: true },
  });

  if (!entry || !entry.comment) return null;

  return {
    comment: entry.comment,
    actorName: entry.actor?.name ?? "A reviewer",
    createdAt: entry.createdAt,
  };
}
