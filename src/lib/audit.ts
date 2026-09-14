import "server-only";

import type { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Shared audit-log writer for content mutations (CLAUDE.md rule 8: changes to official
 * content and admin actions must be traceable). Workflow transitions (submit/approve/
 * reject/publish/archive) log through `applyWorkflowTransition` in
 * src/lib/content-workflow.ts instead — this is for the plain CREATE/UPDATE actions around
 * it (a new record being authored, or an existing one's fields being edited).
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

export async function logAudit(params: {
  actorId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeSnapshot: toJsonSnapshot(params.before),
      afterSnapshot: toJsonSnapshot(params.after),
    },
  });
}
