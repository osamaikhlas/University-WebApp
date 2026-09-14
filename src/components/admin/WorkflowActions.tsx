import {
  getAvailableActions,
  WORKFLOW_TRANSITIONS,
  type ContentStatusValue,
  type WorkflowActionName,
} from "@/lib/content-workflow";
import { Button } from "@/components/ui/Button";

const DESTRUCTIVE_ACTIONS = new Set<WorkflowActionName>(["reject", "archive"]);

/**
 * Renders one form-per-button for whichever workflow actions are legal from the record's
 * current status and the signed-in user's grants. Pure server-rendered forms (no client JS
 * required) — each posts straight to the module's own `transition` Server Action, bound to
 * this record's id and the specific action via `.bind()` (see each module's actions.ts).
 *
 * Purely a UX convenience: `transition` re-derives the permission and re-validates the
 * transition against the record's *current* database status itself, so this component
 * rendering a button is never what makes an action legal (CLAUDE.md rule 5).
 */
export function WorkflowActions({
  entityId,
  status,
  canManage,
  canPublish,
  transition,
}: {
  entityId: string;
  status: ContentStatusValue;
  canManage: boolean;
  canPublish: boolean;
  transition: (id: string, action: WorkflowActionName, formData: FormData) => Promise<void>;
}) {
  const actions = getAvailableActions(status, { canManage, canPublish });
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Workflow actions">
      {actions.map((action) => (
        <form key={action} action={transition.bind(null, entityId, action)}>
          <Button type="submit" variant={DESTRUCTIVE_ACTIONS.has(action) ? "secondary" : "primary"}>
            {WORKFLOW_TRANSITIONS[action].label}
          </Button>
        </form>
      ))}
    </div>
  );
}
