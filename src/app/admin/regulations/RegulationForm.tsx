"use client";

import { useActionState } from "react";
import type { Regulation } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { createRegulation, updateRegulation, type RegulationFormState } from "@/app/admin/regulations/actions";

const initialState: RegulationFormState = { error: null };

type Props = { mode: "create" } | { mode: "edit"; regulation: Regulation };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function RegulationForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateRegulation.bind(null, props.regulation.id) : createRegulation;
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
            defaultValue={isEdit ? props.regulation.title : ""}
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
            placeholder="e.g. Academic, Disciplinary"
            defaultValue={isEdit ? (props.regulation.category ?? "") : ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="regulatingBody" className="text-sm font-medium text-foreground">
          Regulating body <span className="font-normal text-foreground/50">(optional)</span>
        </label>
        <input
          id="regulatingBody"
          name="regulatingBody"
          type="text"
          placeholder="e.g. Higher Education Commission"
          defaultValue={isEdit ? (props.regulation.regulatingBody ?? "") : ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="body" className="text-sm font-medium text-foreground">
          Body <span className="font-normal text-foreground/50">(optional)</span>
        </label>
        <textarea
          id="body"
          name="body"
          rows={10}
          defaultValue={isEdit ? (props.regulation.body ?? "") : ""}
          className={inputClass}
        />
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create regulation"}
      </Button>
    </form>
  );
}
