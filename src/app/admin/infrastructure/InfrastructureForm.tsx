"use client";

import { useActionState } from "react";
import type { Infrastructure } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  createInfrastructure,
  updateInfrastructure,
  type InfrastructureFormState,
} from "@/app/admin/infrastructure/actions";

const initialState: InfrastructureFormState = { error: null };

const CATEGORY_OPTIONS = [
  { value: "CLASSROOM", label: "Classroom" },
  { value: "LAB", label: "Lab" },
  { value: "LIBRARY", label: "Library" },
  { value: "COMPUTER_LAB", label: "Computer Lab" },
  { value: "MOOT_COURT", label: "Moot Court" },
  { value: "OFFICE", label: "Office" },
  { value: "SPORTS", label: "Sports" },
  { value: "OTHER", label: "Other" },
];

type Props = { mode: "create" } | { mode: "edit"; infrastructure: Infrastructure };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function InfrastructureForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateInfrastructure.bind(null, props.infrastructure.id) : createInfrastructure;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className="text-sm font-medium text-foreground">
            Category
          </label>
          <select
            id="category"
            name="category"
            required
            defaultValue={isEdit ? props.infrastructure.category : ""}
            className={inputClass}
          >
            <option value="" disabled>
              Select a category
            </option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. Main Library"
            defaultValue={isEdit ? props.infrastructure.name : ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Description <span className="font-normal text-foreground/50">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={isEdit ? (props.infrastructure.description ?? "") : ""}
          className={inputClass}
        />
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create infrastructure item"}
      </Button>
    </form>
  );
}
