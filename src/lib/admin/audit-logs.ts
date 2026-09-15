import "server-only";

import type { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSkipTake, getTotalPages } from "@/lib/pagination";

/**
 * Read-only queries for the admin Audit log viewer (`/admin/audit-logs`). Deliberately no
 * corresponding write/update/delete functions in this module — `src/lib/audit.ts`'s
 * `logAudit()` is the only way an `AuditLog` row is ever created, and the database itself
 * rejects UPDATE/DELETE on the table (migration `20260916000000_audit_log_hardening`), so
 * there is nothing for a "normal CMS interface" to edit even if someone tried to build one.
 */

// Mirrors prisma/schema.prisma's `AuditAction` enum — Prisma doesn't export the value list
// itself, and every value needs to appear as a filter option in the admin viewer.
export const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "SUBMIT",
  "START_REVIEW",
  "PUBLISH",
  "APPROVE",
  "REJECT",
  "REQUEST_UPDATE",
  "RETURN_TO_DRAFT",
  "COMPLIANCE_SUBMIT_FOR_REVIEW",
  "COMPLIANCE_VERIFY",
  "COMPLIANCE_REQUEST_UPDATE",
  "COMPLIANCE_MARK_NOT_APPLICABLE",
  "COMPLIANCE_REOPEN",
  "COMPLIANCE_EVIDENCE_ADDED",
  "GRIEVANCE_ASSIGN",
  "GRIEVANCE_STATUS_CHANGE",
  "GRIEVANCE_NOTE_ADDED",
  "GRIEVANCE_RESPONSE_SENT",
  "ARCHIVE",
  "UNARCHIVE",
  "UNPUBLISH",
  "FILE_REPLACED",
  "LOGIN",
  "LOGIN_FAILED",
  "LOGOUT",
  "ROLE_CHANGE",
  "MARK_REVIEWED",
  "OTHER",
] as const satisfies readonly AuditAction[];

export function isAuditAction(value: string): value is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(value);
}

/** "CREATE" -> "Create", "START_REVIEW" -> "Start review", "GRIEVANCE_ASSIGN" -> "Grievance assign". */
export function humanizeAuditAction(action: string): string {
  const words = action.toLowerCase().split("_");
  const first = words[0] ?? "";
  return (
    first.charAt(0).toUpperCase() + first.slice(1) + (words.length > 1 ? " " + words.slice(1).join(" ") : "")
  );
}

export type AuditLogListRow = {
  id: string;
  actorName: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  comment: string | null;
  createdAt: Date;
};

export type AuditLogFilter = {
  entityType?: string;
  action?: AuditAction;
  actorQuery?: string;
  page?: number;
};

export type AuditLogPage = {
  rows: AuditLogListRow[];
  totalCount: number;
  totalPages: number;
  page: number;
};

const PAGE_SIZE = 20;

export async function getAuditLogPage(filter: AuditLogFilter): Promise<AuditLogPage> {
  const page = filter.page && filter.page > 0 ? filter.page : 1;

  const where = {
    ...(filter.entityType ? { entityType: { contains: filter.entityType, mode: "insensitive" as const } } : {}),
    ...(filter.action ? { action: filter.action } : {}),
    ...(filter.actorQuery
      ? {
          actor: {
            OR: [
              { name: { contains: filter.actorQuery, mode: "insensitive" as const } },
              { email: { contains: filter.actorQuery, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };

  const [entries, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { name: true } } },
      ...getSkipTake(page, PAGE_SIZE),
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    rows: entries.map((entry) => ({
      id: entry.id,
      actorName: entry.actor?.name ?? "System / anonymous",
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      comment: entry.comment,
      createdAt: entry.createdAt,
    })),
    totalCount,
    totalPages: getTotalPages(totalCount, PAGE_SIZE),
    page,
  };
}

export type AuditLogDetail = {
  id: string;
  actorId: string | null;
  actorName: string;
  actorEmail: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  beforeSnapshot: unknown;
  afterSnapshot: unknown;
  metadata: unknown;
  comment: string | null;
  ipAddress: string | null;
  createdAt: Date;
};

export async function getAuditLogEntry(id: string): Promise<AuditLogDetail | null> {
  const entry = await prisma.auditLog.findUnique({
    where: { id },
    include: { actor: { select: { name: true, email: true } } },
  });
  if (!entry) return null;

  return {
    id: entry.id,
    actorId: entry.actorId,
    actorName: entry.actor?.name ?? "System / anonymous",
    actorEmail: entry.actor?.email ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    beforeSnapshot: entry.beforeSnapshot,
    afterSnapshot: entry.afterSnapshot,
    metadata: entry.metadata,
    comment: entry.comment,
    ipAddress: entry.ipAddress,
    createdAt: entry.createdAt,
  };
}
