import "server-only";

import type { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

/**
 * The grievance case-management workflow (CLAUDE.md rule 6, circular item 19). Deliberately
 * its own state machine rather than reusing `content-workflow.ts` (built around content
 * becoming *public* once published — a grievance must never be public at all) or
 * `compliance-workflow.ts` (built around a fixed 20-item checklist, not a growing list of
 * confidential submissions) — see `progress.md`'s "Next steps" entry this implements.
 *
 * Status lifecycle (mirrors the `GrievanceStatus` enum exactly):
 *
 *   NEW/ASSIGNED --start_review--> UNDER_REVIEW
 *   UNDER_REVIEW --request_action--> ACTION_REQUIRED     (reason mandatory)
 *   ACTION_REQUIRED --resume_review--> UNDER_REVIEW
 *   UNDER_REVIEW/ACTION_REQUIRED --resolve--> RESOLVED    (resolution summary mandatory)
 *   RESOLVED --close--> CLOSED
 *   any non-terminal status --close--> CLOSED             (administrative close, e.g. duplicate/invalid)
 *   RESOLVED/CLOSED --reopen--> UNDER_REVIEW               (reason mandatory)
 *
 * `assignGrievance` (below) is a separate function, not one of these actions — it carries an
 * extra parameter (who it's assigned to) that a plain status transition doesn't, but writes
 * through the same audit convention (CLAUDE.md rule 8).
 *
 * Every caller must call `requirePermission("grievances:manage")` first — this module does
 * not check permissions itself (CLAUDE.md rule 5), matching every other workflow engine in
 * this codebase.
 */
export type GrievanceStatusValue =
  "NEW" | "ASSIGNED" | "UNDER_REVIEW" | "ACTION_REQUIRED" | "RESOLVED" | "CLOSED";

export const GRIEVANCE_ACTIONS = [
  "start_review",
  "request_action",
  "resume_review",
  "resolve",
  "close",
  "reopen",
] as const;

export type GrievanceActionName = (typeof GRIEVANCE_ACTIONS)[number];

/** Actions that require a non-empty comment/reason. */
export const GRIEVANCE_REASON_REQUIRED_ACTIONS = new Set<GrievanceActionName>([
  "request_action",
  "resolve",
  "reopen",
]);

type Transition = {
  from: GrievanceStatusValue[];
  to: GrievanceStatusValue;
  auditAction: AuditAction;
  label: string;
};

export const GRIEVANCE_TRANSITIONS: Record<GrievanceActionName, Transition> = {
  start_review: {
    from: ["NEW", "ASSIGNED"],
    to: "UNDER_REVIEW",
    auditAction: "GRIEVANCE_STATUS_CHANGE",
    label: "Start review",
  },
  request_action: {
    from: ["UNDER_REVIEW"],
    to: "ACTION_REQUIRED",
    auditAction: "GRIEVANCE_STATUS_CHANGE",
    label: "Mark action required",
  },
  resume_review: {
    from: ["ACTION_REQUIRED"],
    to: "UNDER_REVIEW",
    auditAction: "GRIEVANCE_STATUS_CHANGE",
    label: "Resume review",
  },
  resolve: {
    from: ["UNDER_REVIEW", "ACTION_REQUIRED"],
    to: "RESOLVED",
    auditAction: "GRIEVANCE_STATUS_CHANGE",
    label: "Resolve",
  },
  close: {
    from: ["NEW", "ASSIGNED", "UNDER_REVIEW", "ACTION_REQUIRED", "RESOLVED"],
    to: "CLOSED",
    auditAction: "GRIEVANCE_STATUS_CHANGE",
    label: "Close",
  },
  reopen: {
    from: ["RESOLVED", "CLOSED"],
    to: "UNDER_REVIEW",
    auditAction: "GRIEVANCE_STATUS_CHANGE",
    label: "Reopen",
  },
};

export class GrievanceWorkflowError extends Error {}

type GrievanceUpdateData = {
  status: GrievanceStatusValue;
  updatedBy: string;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
};

/** Applies one status transition: validates it's legal from the record's current status,
 * enforces the reason-required rule, sets `resolvedAt`/`closedAt` (and clears them on
 * reopen), and writes the audit trail entry — actor, timestamp, before/after status, and the
 * comment all on one `AuditLog` row. */
export async function applyGrievanceTransition(params: {
  grievanceId: string;
  currentStatus: GrievanceStatusValue;
  action: GrievanceActionName;
  actorId: string;
  comment?: string;
}): Promise<void> {
  const transition = GRIEVANCE_TRANSITIONS[params.action];

  if (!transition.from.includes(params.currentStatus)) {
    throw new GrievanceWorkflowError(
      `Cannot "${transition.label}" from status ${params.currentStatus} — must be one of: ${transition.from.join(", ")}.`,
    );
  }

  const comment = params.comment?.trim() || undefined;
  if (GRIEVANCE_REASON_REQUIRED_ACTIONS.has(params.action) && !comment) {
    throw new GrievanceWorkflowError(`"${transition.label}" requires a reason/comment.`);
  }

  const data: GrievanceUpdateData = { status: transition.to, updatedBy: params.actorId };
  if (transition.to === "RESOLVED") data.resolvedAt = new Date();
  if (transition.to === "CLOSED") data.closedAt = new Date();
  if (transition.to === "UNDER_REVIEW" && params.action === "reopen") {
    data.resolvedAt = null;
    data.closedAt = null;
  }

  await prisma.grievance.update({ where: { id: params.grievanceId }, data });

  await logAudit({
    actorId: params.actorId,
    action: transition.auditAction,
    entityType: "Grievance",
    entityId: params.grievanceId,
    comment,
    before: { status: params.currentStatus },
    after: { status: transition.to },
  });
}

/** Which of the workflow actions are currently legal from `status` — purely a UX convenience
 * for deciding which buttons to render; `applyGrievanceTransition` re-validates everything
 * server-side regardless (CLAUDE.md rule 5). */
export function getAvailableGrievanceActions(status: GrievanceStatusValue): GrievanceActionName[] {
  return GRIEVANCE_ACTIONS.filter((action) => GRIEVANCE_TRANSITIONS[action].from.includes(status));
}

const TERMINAL_STATUSES = new Set<GrievanceStatusValue>(["CLOSED"]);
const ASSIGNABLE_FROM = new Set<GrievanceStatusValue>([
  "NEW",
  "ASSIGNED",
  "UNDER_REVIEW",
  "ACTION_REQUIRED",
]);

export function canAssignFrom(status: GrievanceStatusValue): boolean {
  return ASSIGNABLE_FROM.has(status);
}

export function isTerminalStatus(status: GrievanceStatusValue): boolean {
  return TERMINAL_STATUSES.has(status);
}

/** Assigns (or reassigns) a grievance to a staff member and moves NEW cases to ASSIGNED —
 * kept separate from `applyGrievanceTransition` because it carries an extra field
 * (`assigneeId`) a plain status flip doesn't. Reassigning an already-ASSIGNED/UNDER_REVIEW/
 * ACTION_REQUIRED case keeps its current status (only ever advances NEW -> ASSIGNED). */
export async function assignGrievance(params: {
  grievanceId: string;
  currentStatus: GrievanceStatusValue;
  currentAssigneeId?: string | null;
  assigneeId: string;
  actorId: string;
}): Promise<void> {
  if (!canAssignFrom(params.currentStatus)) {
    throw new GrievanceWorkflowError(
      `Cannot assign a grievance from status ${params.currentStatus} — reopen it first.`,
    );
  }

  const nextStatus: GrievanceStatusValue =
    params.currentStatus === "NEW" ? "ASSIGNED" : params.currentStatus;

  await prisma.grievance.update({
    where: { id: params.grievanceId },
    data: { assignedToId: params.assigneeId, status: nextStatus, updatedBy: params.actorId },
  });

  await logAudit({
    actorId: params.actorId,
    action: "GRIEVANCE_ASSIGN",
    entityType: "Grievance",
    entityId: params.grievanceId,
    before: { assignedToId: params.currentAssigneeId ?? null, status: params.currentStatus },
    after: { assignedToId: params.assigneeId, status: nextStatus },
  });
}
