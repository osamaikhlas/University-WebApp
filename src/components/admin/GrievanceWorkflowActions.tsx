import {
  getAvailableGrievanceActions,
  GRIEVANCE_REASON_REQUIRED_ACTIONS,
  GRIEVANCE_TRANSITIONS,
  type GrievanceActionName,
  type GrievanceStatusValue,
} from "@/lib/grievance-workflow";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const DESTRUCTIVE_ACTIONS = new Set<GrievanceActionName>(["close"]);

/**
 * Status-change actions for one grievance — mirrors `WorkflowActions.tsx`'s shape (one shared
 * comment field, one submit button per currently-legal action) but against the grievance
 * state machine instead of the content one. Only rendered for callers who already hold
 * `grievances:manage` (checked by the parent Server Component); `transition` itself
 * re-validates the transition against the record's live database status regardless
 * (CLAUDE.md rule 5).
 */
export function GrievanceWorkflowActions({
  grievanceId,
  status,
  transition,
  workflowError,
}: {
  grievanceId: string;
  status: GrievanceStatusValue;
  transition: (id: string, action: GrievanceActionName, formData: FormData) => Promise<void>;
  workflowError?: string;
}) {
  const actions = getAvailableGrievanceActions(status);

  if (actions.length === 0 && !workflowError) return null;

  return (
    <div className="flex flex-col gap-3">
      {workflowError ? <Alert tone="danger">{workflowError}</Alert> : null}

      {actions.length > 0 ? (
        <form className="flex flex-col gap-3" aria-label="Grievance status actions">
          <div>
            <label htmlFor={`grievance-comment-${grievanceId}`} className="text-sm font-medium">
              Comment / reason
            </label>
            <textarea
              id={`grievance-comment-${grievanceId}`}
              name="comment"
              rows={2}
              className="mt-1 w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm"
              placeholder="Required to mark action required, resolve, or reopen; optional otherwise."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action}
                type="submit"
                formAction={transition.bind(null, grievanceId, action)}
                variant={DESTRUCTIVE_ACTIONS.has(action) ? "secondary" : "primary"}
              >
                {GRIEVANCE_TRANSITIONS[action].label}
                {GRIEVANCE_REASON_REQUIRED_ACTIONS.has(action) ? " *" : ""}
              </Button>
            ))}
          </div>
        </form>
      ) : null}
    </div>
  );
}
