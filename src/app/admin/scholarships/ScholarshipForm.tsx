"use client";

import { useActionState } from "react";
import type { Scholarship } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { createScholarship, updateScholarship, type ScholarshipFormState } from "@/app/admin/scholarships/actions";

const initialState: ScholarshipFormState = { error: null };

type Props = { mode: "create" } | { mode: "edit"; scholarship: Scholarship };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function ScholarshipForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateScholarship.bind(null, props.scholarship.id) : createScholarship;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={isEdit ? props.scholarship.name : ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Description <span className="font-normal text-foreground/60">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={isEdit ? (props.scholarship.description ?? "") : ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="eligibility" className="text-sm font-medium text-foreground">
          Eligibility <span className="font-normal text-foreground/60">(optional)</span>
        </label>
        <textarea
          id="eligibility"
          name="eligibility"
          rows={4}
          defaultValue={isEdit ? (props.scholarship.eligibility ?? "") : ""}
          className={inputClass}
        />
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create scholarship"}
      </Button>
    </form>
  );
}
