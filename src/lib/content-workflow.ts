import "server-only";

import type { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * The content approval workflow shared by every CMS content module (College Profile,
 * Departments, Programs, Faculty, Staff, Notices, ... — see
 * src/lib/admin/module-permissions.ts for the full list). Built once here rather than
 * reimplemented per module.
 *
 * State machine (mirrors the `ContentStatus` enum in prisma/schema.prisma exactly):
 *
 *   DRAFT --submit_for_review--> SUBMITTED --start_review--> UNDER_REVIEW
 *     UNDER_REVIEW --approve--> APPROVED --publish--> PUBLISHED
 *     UNDER_REVIEW --reject--> DRAFT   (a rejection reason/comment is mandatory)
 *   PUBLISHED --request_update--> UPDATE_REQUIRED --return_to_draft--> DRAFT
 *
 * Only PUBLISHED content is ever shown on the public site (CLAUDE.md rule 4) — see
 * src/lib/content.ts's queries, every one of which filters on `status: "PUBLISHED"`. Reaching
 * PUBLISHED always means the record passed through APPROVED first, since that is the only
 * transition that leads there.
 */
export type ContentStatusValue =
  "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "PUBLISHED" | "UPDATE_REQUIRED";

export const WORKFLOW_ACTIONS = [
  "submit_for_review",
  "start_review",
  "approve",
  "reject",
  "publish",
  "request_update",
  "return_to_draft",
] as const;

export type WorkflowActionName = (typeof WORKFLOW_ACTIONS)[number];

/**
 * Actions an author/manager performs on their own content (`manage` permission). Every other
 * action is a higher-trust reviewer/publisher action (`publish` permission) — see
 * `getAvailableActions` and each module's `transition*` Server Action. No role holds both
 * `manage` and `publish` for the same domain (docs/permission-matrix.md), so an author can
 * never approve, review, or publish their own submission.
 */
export const MANAGE_PERMISSION_ACTIONS = new Set<WorkflowActionName>([
  "submit_for_review",
  "return_to_draft",
]);

/** Actions that require a non-empty comment/reason — currently just rejection. */
export const REASON_REQUIRED_ACTIONS = new Set<WorkflowActionName>(["reject"]);

type Transition = {
  from: ContentStatusValue[];
  to: ContentStatusValue;
  auditAction: AuditAction;
  label: string;
};

export const WORKFLOW_TRANSITIONS: Record<WorkflowActionName, Transition> = {
  submit_for_review: {
    from: ["DRAFT"],
    to: "SUBMITTED",
    auditAction: "SUBMIT",
    label: "Submit for review",
  },
  start_review: {
    from: ["SUBMITTED"],
    to: "UNDER_REVIEW",
    auditAction: "START_REVIEW",
    label: "Start review",
  },
  approve: {
    from: ["UNDER_REVIEW"],
    to: "APPROVED",
    auditAction: "APPROVE",
    label: "Approve",
  },
  reject: {
    from: ["UNDER_REVIEW"],
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
  request_update: {
    from: ["PUBLISHED"],
    to: "UPDATE_REQUIRED",
    auditAction: "REQUEST_UPDATE",
    label: "Request update",
  },
  return_to_draft: {
    from: ["UPDATE_REQUIRED"],
    to: "DRAFT",
    auditAction: "RETURN_TO_DRAFT",
    label: "Return to draft",
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
 * Applies one workflow transition, enforcing that a reason/comment is present for actions
 * that require one (rejection must always carry a rejection reason), and writes the audit
 * trail entry for it — actor, timestamp (`AuditLog.createdAt`), the before/after status, and
 * the comment/reason are all stored on that one row (CLAUDE.md rule 8). `update` is an
 * injected callback (rather than a generic Prisma delegate) so this stays fully type-safe
 * against each module's own Prisma model without needing a structurally-unified delegate
 * type across models that don't actually share one.
 *
 * This function is the single place transitions are validated; it does not check
 * permissions itself — every caller (each module's `transition*` Server Action) calls
 * `requirePermission` first, re-deriving the caller's grant from the database rather than
 * trusting the client (CLAUDE.md rule 5).
 */
export async function applyWorkflowTransition(params: {
  entityType: string;
  entityId: string;
  currentStatus: ContentStatusValue;
  action: WorkflowActionName;
  actorId: string;
  comment?: string;
  update: (data: WorkflowUpdateData) => Promise<unknown>;
}): Promise<void> {
  const transition = WORKFLOW_TRANSITIONS[params.action];

  if (!transition.from.includes(params.currentStatus)) {
    throw new WorkflowError(
      `Cannot "${transition.label}" from status ${params.currentStatus} — must be one of: ${transition.from.join(", ")}.`,
    );
  }

  const comment = params.comment?.trim() || undefined;
  if (REASON_REQUIRED_ACTIONS.has(params.action) && !comment) {
    throw new WorkflowError(`"${transition.label}" requires a reason/comment.`);
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
      comment,
      beforeSnapshot: { status: params.currentStatus },
      afterSnapshot: { status: transition.to },
    },
  });
}

/**
 * Which of the workflow actions are currently legal for `status`, filtered further by what
 * the caller is allowed to do (`canManage` covers submit-for-review/return-to-draft;
 * `canPublish` covers start-review/approve/reject/publish/request-update). This is what the
 * UI uses to decide which buttons to render — but it is never the security boundary by
 * itself: each Server Action independently re-checks the permission and re-validates the
 * transition server-side (CLAUDE.md rule 5), so a stale or tampered UI can never perform an
 * action the caller isn't actually allowed.
 */
export function getAvailableActions(
  status: ContentStatusValue,
  grants: { canManage: boolean; canPublish: boolean },
): WorkflowActionName[] {
  return WORKFLOW_ACTIONS.filter((action) => {
    if (!WORKFLOW_TRANSITIONS[action].from.includes(status)) return false;
    return MANAGE_PERMISSION_ACTIONS.has(action) ? grants.canManage : grants.canPublish;
  });
}

/** True for the only two statuses CLAUDE.md rule 4 allows public views/APIs to expose. */
export function isPubliclyVisible(status: ContentStatusValue): boolean {
  return status === "PUBLISHED";
}
