"use client";

import { useActionState } from "react";
import type { StudentSupport } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  createStudentSupport,
  updateStudentSupport,
  type StudentSupportFormState,
} from "@/app/admin/student-support/actions";

const initialState: StudentSupportFormState = { error: null };

type Props = { mode: "create" } | { mode: "edit"; studentSupport: StudentSupport };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function StudentSupportForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateStudentSupport.bind(null, props.studentSupport.id) : createStudentSupport;
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
          placeholder="e.g. Counseling Services"
          defaultValue={isEdit ? props.studentSupport.name : ""}
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
          defaultValue={isEdit ? (props.studentSupport.description ?? "") : ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contactInfo" className="text-sm font-medium text-foreground">
          Contact info <span className="font-normal text-foreground/60">(optional)</span>
        </label>
        <input
          id="contactInfo"
          name="contactInfo"
          type="text"
          defaultValue={isEdit ? (props.studentSupport.contactInfo ?? "") : ""}
          className={inputClass}
        />
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create student support service"}
      </Button>
    </form>
  );
}
