import {
  getAvailableActions,
  REASON_REQUIRED_ACTIONS,
  WORKFLOW_TRANSITIONS,
  type ContentStatusValue,
  type WorkflowActionName,
} from "@/lib/content-workflow";
import { getLatestActionComment } from "@/lib/audit";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const DESTRUCTIVE_ACTIONS = new Set<WorkflowActionName>(["reject", "request_update"]);

/**
 * Renders one shared comment/reason field plus one submit button per workflow action that is
 * legal from the record's current status and the signed-in user's grants. All buttons live in
 * the same `<form>` (each overrides where it submits via `formAction`, a standard HTML
 * attribute Next.js Server Actions support), so the one comment field is included in whichever
 * action's `formData` regardless of which button was clicked — no client JS required.
 *
 * Purely a UX convenience: `transition` re-derives the permission and re-validates the
 * transition (including the "rejection requires a reason" rule) against the record's *current*
 * database status itself, so this component rendering a button is never what makes an action
 * legal (CLAUDE.md rule 5). `workflowError`, when present (the transition Server Action
 * redirects back here with `?workflowError=...` on a validation failure), is rendered as an
 * alert so a rejected-without-a-reason submission is visible, not silently dropped.
 *
 * An async Server Component: when `status` is `UPDATE_REQUIRED`, it looks up the reviewer's
 * `request_update` reason itself (via `getLatestActionComment`) and surfaces it as a banner,
 * rather than leaving the author to go dig it out of the audit trail. `entityType` must be the
 * same string the module's own Server Actions pass to `applyWorkflowTransition`, so the lookup
 * matches the entries that action actually wrote.
 */
export async function WorkflowActions({
  entityType,
  entityId,
  status,
  canManage,
  canPublish,
  transition,
  workflowError,
}: {
  entityType: string;
  entityId: string;
  status: ContentStatusValue;
  canManage: boolean;
  canPublish: boolean;
  transition: (id: string, action: WorkflowActionName, formData: FormData) => Promise<void>;
  workflowError?: string;
}) {
  const actions = getAvailableActions(status, { canManage, canPublish });
  const updateRequested =
    status === "UPDATE_REQUIRED"
      ? await getLatestActionComment({ entityType, entityId, action: "REQUEST_UPDATE" })
      : null;

  return (
    <div className="flex flex-col gap-3">
      {workflowError ? <Alert tone="danger">{workflowError}</Alert> : null}
      {updateRequested ? (
        <Alert tone="warning" title="Update requested">
          {updateRequested.actorName} on {updateRequested.createdAt.toLocaleDateString()}:{" "}
          {updateRequested.comment}
        </Alert>
      ) : null}

      {actions.length > 0 ? (
        <form className="flex flex-col gap-3" aria-label="Workflow actions">
          <div>
            <label htmlFor={`workflow-comment-${entityId}`} className="text-sm font-medium">
              Comment / reason
            </label>
            <textarea
              id={`workflow-comment-${entityId}`}
              name="comment"
              rows={2}
              className="mt-1 w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm"
              placeholder="Required when rejecting; optional otherwise."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action}
                type="submit"
                formAction={transition.bind(null, entityId, action)}
                variant={DESTRUCTIVE_ACTIONS.has(action) ? "secondary" : "primary"}
              >
                {WORKFLOW_TRANSITIONS[action].label}
                {REASON_REQUIRED_ACTIONS.has(action) ? " *" : ""}
              </Button>
            ))}
          </div>
        </form>
      ) : null}
    </div>
  );
}
