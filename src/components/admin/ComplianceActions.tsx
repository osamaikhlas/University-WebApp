import {
  COMPLIANCE_TRANSITIONS,
  getAvailableComplianceActions,
  REASON_REQUIRED_ACTIONS,
  type ComplianceActionName,
  type ComplianceStatusValue,
} from "@/lib/compliance-workflow";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const DESTRUCTIVE_ACTIONS = new Set<ComplianceActionName>(["request_update", "mark_not_applicable"]);

/**
 * Renders the verify / reject-review / mark-not-applicable / reopen / submit-for-review
 * buttons legal from the requirement's current status and the signed-in user's grants, plus
 * one shared reviewer-notes field (mirrors `WorkflowActions` — see that component for why a
 * single `<form>` with per-button `formAction` needs no client JS to route one comment field
 * to whichever action was clicked).
 *
 * `transition` re-derives the permission and re-validates the transition against the
 * requirement's current database status itself — this component is a UX convenience only,
 * never the security boundary (CLAUDE.md rule 5; CLAUDE.md rule 7: VERIFIED can only ever be
 * reached through the "verify" action below, and only by a `compliance:verify` holder).
 */
export function ComplianceActions({
  requirementId,
  status,
  canView,
  canVerify,
  transition,
  workflowError,
}: {
  requirementId: string;
  status: ComplianceStatusValue;
  canView: boolean;
  canVerify: boolean;
  transition: (
    id: string,
    action: ComplianceActionName,
    formData: FormData,
  ) => Promise<void>;
  workflowError?: string;
}) {
  const actions = getAvailableComplianceActions(status, { canView, canVerify });

  return (
    <div className="flex flex-col gap-3">
      {workflowError ? <Alert tone="danger">{workflowError}</Alert> : null}

      {actions.length > 0 ? (
        <form className="flex flex-col gap-3" aria-label="Compliance actions">
          <div>
            <label htmlFor={`compliance-comment-${requirementId}`} className="text-sm font-medium">
              Reviewer notes
            </label>
            <textarea
              id={`compliance-comment-${requirementId}`}
              name="comment"
              rows={2}
              className="mt-1 w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm"
              placeholder="Required when rejecting or marking not applicable; optional otherwise."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action}
                type="submit"
                formAction={transition.bind(null, requirementId, action)}
                variant={DESTRUCTIVE_ACTIONS.has(action) ? "secondary" : "primary"}
              >
                {COMPLIANCE_TRANSITIONS[action].label}
                {REASON_REQUIRED_ACTIONS.has(action) ? " *" : ""}
              </Button>
            ))}
          </div>
        </form>
      ) : null}
    </div>
  );
}
