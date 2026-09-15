import "server-only";

import type { AuditAction, VerificationDecision } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

/**
 * The compliance verification workflow (docs/compliance-matrix.md §3, CLAUDE.md rule 7).
 *
 * Status lifecycle:
 *
 *   NOT_STARTED <---> IN_PROGRESS        (automatic — see `syncAutomaticStatus` below)
 *   IN_PROGRESS --submit_for_review--> READY_FOR_REVIEW
 *   READY_FOR_REVIEW --verify--> VERIFIED
 *   READY_FOR_REVIEW --request_update--> NEEDS_UPDATE        (reason mandatory)
 *   VERIFIED --request_update--> NEEDS_UPDATE                (reason mandatory — a
 *                                                              previously-verified item found
 *                                                              to need fixing)
 *   NEEDS_UPDATE --submit_for_review--> READY_FOR_REVIEW      (after the owner fixes it)
 *   NOT_STARTED/IN_PROGRESS --mark_not_applicable--> NOT_APPLICABLE   (reason mandatory)
 *   NOT_APPLICABLE --reopen--> NOT_STARTED
 *
 * `verify` and `request_update` are the only two actions that may ever move a requirement
 * into or out of VERIFIED, and both require the `compliance:verify` permission (the
 * authorized human reviewer — Principal/Administrator/Super Admin) and write an append-only
 * `ComplianceVerification` row, so "who verified this and when" and the full history of
 * verify/needs-update cycles is always reconstructable (CLAUDE.md rule 8). A requirement can
 * never reach VERIFIED any other way — not automatically, not as a side effect of completing
 * a checklist.
 */
export type ComplianceStatusValue =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "READY_FOR_REVIEW"
  | "VERIFIED"
  | "NEEDS_UPDATE"
  | "NOT_APPLICABLE";

export const COMPLIANCE_ACTIONS = [
  "submit_for_review",
  "verify",
  "request_update",
  "mark_not_applicable",
  "reopen",
] as const;

export type ComplianceActionName = (typeof COMPLIANCE_ACTIONS)[number];

/**
 * `submit_for_review` is an owner-level action (anyone who can see the compliance module —
 * `compliance:view`). Every other action is the higher-trust reviewer decision
 * (`compliance:verify`) — see `getAvailableComplianceActions` and
 * `src/app/admin/compliance/actions.ts`.
 */
export const VIEW_PERMISSION_ACTIONS = new Set<ComplianceActionName>(["submit_for_review"]);

/** Actions that require a non-empty reviewer note/reason. */
export const REASON_REQUIRED_ACTIONS = new Set<ComplianceActionName>([
  "request_update",
  "mark_not_applicable",
]);

type Transition = {
  from: ComplianceStatusValue[];
  to: ComplianceStatusValue;
  auditAction: AuditAction;
  /** Set when this transition is a human verification decision that must be recorded. */
  decision?: VerificationDecision;
  label: string;
};

export const COMPLIANCE_TRANSITIONS: Record<ComplianceActionName, Transition> = {
  submit_for_review: {
    from: ["IN_PROGRESS", "NEEDS_UPDATE"],
    to: "READY_FOR_REVIEW",
    auditAction: "COMPLIANCE_SUBMIT_FOR_REVIEW",
    label: "Submit for review",
  },
  verify: {
    from: ["READY_FOR_REVIEW"],
    to: "VERIFIED",
    auditAction: "COMPLIANCE_VERIFY",
    decision: "VERIFIED",
    label: "Verify",
  },
  request_update: {
    from: ["READY_FOR_REVIEW", "VERIFIED"],
    to: "NEEDS_UPDATE",
    auditAction: "COMPLIANCE_REQUEST_UPDATE",
    decision: "NEEDS_UPDATE",
    label: "Reject / needs update",
  },
  mark_not_applicable: {
    from: ["NOT_STARTED", "IN_PROGRESS"],
    to: "NOT_APPLICABLE",
    auditAction: "COMPLIANCE_MARK_NOT_APPLICABLE",
    label: "Mark not applicable",
  },
  reopen: {
    from: ["NOT_APPLICABLE"],
    to: "NOT_STARTED",
    auditAction: "COMPLIANCE_REOPEN",
    label: "Reopen",
  },
};

export class ComplianceWorkflowError extends Error {}

/**
 * Applies one explicit compliance transition — enforcing the reason-required rule, updating
 * the requirement's status, recording a `ComplianceVerification` row for verify/needs-update
 * decisions, and writing the audit trail entry (actor, timestamp, before/after status, and
 * the comment, all on one row — CLAUDE.md rule 8).
 *
 * This function does not check permissions itself; every caller must call
 * `requirePermission` first with the correct grant for `action` (CLAUDE.md rule 5).
 */
export async function applyComplianceTransition(params: {
  requirementId: string;
  currentStatus: ComplianceStatusValue;
  action: ComplianceActionName;
  actorId: string;
  comment?: string;
}): Promise<void> {
  const transition = COMPLIANCE_TRANSITIONS[params.action];

  if (!transition.from.includes(params.currentStatus)) {
    throw new ComplianceWorkflowError(
      `Cannot "${transition.label}" from status ${params.currentStatus} — must be one of: ${transition.from.join(", ")}.`,
    );
  }

  const comment = params.comment?.trim() || undefined;
  if (REASON_REQUIRED_ACTIONS.has(params.action) && !comment) {
    throw new ComplianceWorkflowError(`"${transition.label}" requires a reason/comment.`);
  }

  await prisma.complianceRequirement.update({
    where: { id: params.requirementId },
    data: { status: transition.to },
  });

  if (transition.decision) {
    await prisma.complianceVerification.create({
      data: {
        requirementId: params.requirementId,
        decision: transition.decision,
        verifiedById: params.actorId,
        note: comment,
      },
    });
  }

  await logAudit({
    actorId: params.actorId,
    action: transition.auditAction,
    entityType: "ComplianceRequirement",
    entityId: params.requirementId,
    comment,
    before: { status: params.currentStatus },
    after: { status: transition.to },
    metadata: transition.decision ? { decision: transition.decision } : undefined,
  });
}

/**
 * Which compliance actions are legal from `status`, filtered further by the caller's grants.
 * Purely a UX convenience for deciding which buttons to render — `applyComplianceTransition`
 * re-validates everything server-side regardless (CLAUDE.md rule 5).
 */
export function getAvailableComplianceActions(
  status: ComplianceStatusValue,
  grants: { canView: boolean; canVerify: boolean },
): ComplianceActionName[] {
  return COMPLIANCE_ACTIONS.filter((action) => {
    if (!COMPLIANCE_TRANSITIONS[action].from.includes(status)) return false;
    return VIEW_PERMISSION_ACTIONS.has(action) ? grants.canView : grants.canVerify;
  });
}

const AUTOMATIC_STATUSES = new Set<ComplianceStatusValue>(["NOT_STARTED", "IN_PROGRESS"]);

/**
 * The only automatic status transition in this workflow: NOT_STARTED <-> IN_PROGRESS,
 * recalculated from whether any real content or evidence exists yet for the requirement.
 * This is bookkeeping, not an approval decision (rule 7 only gates VERIFIED), so it writes
 * no `ComplianceVerification` row and is a no-op once a requirement has moved into any of
 * the human-gated states (READY_FOR_REVIEW/VERIFIED/NEEDS_UPDATE/NOT_APPLICABLE) — an
 * automatic recompute must never override a human decision. Still logs to the audit trail
 * with a null actor, so "the system changed this, not a person" stays traceable (rule 8).
 */
export async function syncAutomaticStatus(params: {
  requirementId: string;
  currentStatus: ComplianceStatusValue;
  hasProgress: boolean;
}): Promise<ComplianceStatusValue> {
  if (!AUTOMATIC_STATUSES.has(params.currentStatus)) return params.currentStatus;

  const nextStatus: ComplianceStatusValue = params.hasProgress ? "IN_PROGRESS" : "NOT_STARTED";
  if (nextStatus === params.currentStatus) return params.currentStatus;

  await prisma.complianceRequirement.update({
    where: { id: params.requirementId },
    data: { status: nextStatus },
  });

  await logAudit({
    actorId: null,
    action: "UPDATE",
    entityType: "ComplianceRequirement",
    entityId: params.requirementId,
    comment: "Automatically recalculated from data completeness.",
    before: { status: params.currentStatus },
    after: { status: nextStatus },
    metadata: { automatic: true },
  });

  return nextStatus;
}
