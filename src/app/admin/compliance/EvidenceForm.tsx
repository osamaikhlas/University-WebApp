"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { addEvidence, type EvidenceFormState } from "@/app/admin/compliance/actions";

const initialState: EvidenceFormState = { error: null };

/**
 * Attaches a piece of evidence (a pointer to whatever record satisfies this requirement —
 * e.g. entityType "Faculty", entityId "<id>") plus an optional note. Evidence existing is a
 * precondition a reviewer checks before verifying, never something that verifies a
 * requirement by itself (CLAUDE.md rule 7).
 */
export function EvidenceForm({ requirementId }: { requirementId: string }) {
  const action = addEvidence.bind(null, requirementId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="entityType" className="text-sm font-medium text-foreground">
            Entity type
          </label>
          <input
            id="entityType"
            name="entityType"
            type="text"
            required
            placeholder="e.g. Faculty, Program, Notice"
            className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="entityId" className="text-sm font-medium text-foreground">
            Entity ID
          </label>
          <input
            id="entityId"
            name="entityId"
            type="text"
            required
            className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="text-sm font-medium text-foreground">
          Note <span className="font-normal text-foreground/60">(optional)</span>
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} variant="secondary" className="self-start">
        {isPending ? "Adding…" : "Add evidence"}
      </Button>
    </form>
  );
}
