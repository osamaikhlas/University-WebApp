import "server-only";

import type { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Generic draft → review → publish → archive state machine shared by every CMS content
 * module (College Profile, Departments, Programs, Faculty, Staff, and future modules).
 * Built once here rather than reimplemented per module, per docs/implementation-plan.md's
 * original Phase 2 goal ("the shared draft → review → approve → publish machinery... built
 * once before any specific content module uses it").
 *
 * Mirrors the `ContentStatus` enum in prisma/schema.prisma exactly.
 */
export type ContentStatusValue = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";

export const WORKFLOW_ACTIONS = [
  "submit_for_review",
  "approve",
  "reject",
  "publish",
  "archive",
] as const;

export type WorkflowActionName = (typeof WORKFLOW_ACTIONS)[number];

type Transition = {
  from: ContentStatusValue[];
  to: ContentStatusValue;
  auditAction: AuditAction;
  label: string;
};

/**
 * The full state machine. `archive` is reachable from any non-archived state (abandoning a
 * draft counts as archiving it, not deleting it — CLAUDE.md rule 8: keep audit history,
 * never delete). There is deliberately no transition back out of ARCHIVED yet; see
 * progress.md's open questions.
 */
export const WORKFLOW_TRANSITIONS: Record<WorkflowActionName, Transition> = {
  submit_for_review: {
    from: ["DRAFT"],
    to: "PENDING_REVIEW",
    auditAction: "UPDATE",
    label: "Submit for review",
  },
  approve: {
    from: ["PENDING_REVIEW"],
    to: "APPROVED",
    auditAction: "APPROVE",
    label: "Approve",
  },
  reject: {
    from: ["PENDING_REVIEW"],
    to: "DRAFT",
    auditAction: "REJECT",
    label: "Reject (send back to draft)",
  },
  publish: {
    from: ["APPROVED"],
    to: "PUBLISHED",
    auditAction: "PUBLISH",
    label: "Publish",
  },
  archive: {
    from: ["DRAFT", "PENDING_REVIEW", "APPROVED", "PUBLISHED"],
    to: "ARCHIVED",
    auditAction: "UPDATE",
    label: "Archive",
  },
};

export class WorkflowError extends Error {}

export type WorkflowUpdateData = {
  status: ContentStatusValue;
  updatedBy: string;
  publishedAt?: Date;
  publishedBy?: string;
};

/**
 * Applies one workflow transition and writes the audit trail entry for it. `update` is an
 * injected callback (rather than a generic Prisma delegate) so this stays fully type-safe
 * against each module's own Prisma model without needing a structurally-unified delegate
 * type across models that don't actually share one.
 */
export async function applyWorkflowTransition(params: {
  entityType: string;
  entityId: string;
  currentStatus: ContentStatusValue;
  action: WorkflowActionName;
  actorId: string;
  update: (data: WorkflowUpdateData) => Promise<unknown>;
}): Promise<void> {
  const transition = WORKFLOW_TRANSITIONS[params.action];

  if (!transition.from.includes(params.currentStatus)) {
    throw new WorkflowError(
      `Cannot "${transition.label}" from status ${params.currentStatus} — must be one of: ${transition.from.join(", ")}.`,
    );
  }

  const data: WorkflowUpdateData = { status: transition.to, updatedBy: params.actorId };
  if (transition.to === "PUBLISHED") {
    data.publishedAt = new Date();
    data.publishedBy = params.actorId;
  }

  await params.update(data);

  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: transition.auditAction,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeSnapshot: { status: params.currentStatus },
      afterSnapshot: { status: transition.to },
    },
  });
}

/**
 * Which of the 5 workflow actions are currently legal for `status`, filtered further by
 * what the caller is allowed to do (`canManage` covers submit-for-review; `canPublish`
 * covers approve/reject/publish/archive). This is what the UI uses to decide which buttons
 * to render — but it is never the security boundary by itself: each Server Action
 * independently re-checks the permission and re-validates the transition server-side
 * (CLAUDE.md rule 5), so a stale or tampered UI can never perform an action the caller
 * isn't actually allowed.
 */
export function getAvailableActions(
  status: ContentStatusValue,
  grants: { canManage: boolean; canPublish: boolean },
): WorkflowActionName[] {
  return WORKFLOW_ACTIONS.filter((action) => {
    if (!WORKFLOW_TRANSITIONS[action].from.includes(status)) return false;
    if (action === "submit_for_review") return grants.canManage;
    return grants.canPublish;
  });
}
