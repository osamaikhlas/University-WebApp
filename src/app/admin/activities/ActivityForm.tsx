"use client";

import { useActionState } from "react";
import type { Activity } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { createActivity, updateActivity, type ActivityFormState } from "@/app/admin/activities/actions";

const initialState: ActivityFormState = { error: null };

type Props = { mode: "create" } | { mode: "edit"; activity: Activity };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function ActivityForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateActivity.bind(null, props.activity.id) : createActivity;
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
            defaultValue={isEdit ? props.activity.title : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className="text-sm font-medium text-foreground">
            Category <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <input
            id="category"
            name="category"
            type="text"
            placeholder="e.g. Sports, Cultural, Community Service"
            defaultValue={isEdit ? (props.activity.category ?? "") : ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Description <span className="font-normal text-foreground/60">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={isEdit ? (props.activity.description ?? "") : ""}
          className={inputClass}
        />
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create activity"}
      </Button>
    </form>
  );
}
