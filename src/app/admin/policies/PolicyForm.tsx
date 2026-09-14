"use client";

import { useActionState } from "react";
import type { Policy } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { createPolicy, updatePolicy, type PolicyFormState } from "@/app/admin/policies/actions";

const initialState: PolicyFormState = { error: null };

type Props = { mode: "create" } | { mode: "edit"; policy: Policy };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function PolicyForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updatePolicy.bind(null, props.policy.id) : createPolicy;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm font-medium text-foreground">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={isEdit ? props.policy.title : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className="text-sm font-medium text-foreground">
            Category <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="category"
            name="category"
            type="text"
            placeholder="e.g. Academic, Administrative"
            defaultValue={isEdit ? (props.policy.category ?? "") : ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="body" className="text-sm font-medium text-foreground">
          Body <span className="font-normal text-foreground/50">(optional)</span>
        </label>
        <textarea
          id="body"
          name="body"
          rows={10}
          defaultValue={isEdit ? (props.policy.body ?? "") : ""}
          className={inputClass}
        />
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create policy"}
      </Button>
    </form>
  );
}
