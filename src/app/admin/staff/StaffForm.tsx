"use client";

import { useActionState } from "react";
import type { Staff } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { createStaff, updateStaff, type StaffFormState } from "@/app/admin/staff/actions";

const initialState: StaffFormState = { error: null };

type Props = { mode: "create" } | { mode: "edit"; staff: Staff };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function StaffForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateStaff.bind(null, props.staff.id) : createStaff;
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
          defaultValue={isEdit ? props.staff.name : ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="designation" className="text-sm font-medium text-foreground">
          Designation
        </label>
        <input
          id="designation"
          name="designation"
          type="text"
          required
          defaultValue={isEdit ? props.staff.designation : ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="department" className="text-sm font-medium text-foreground">
          Department / Office <span className="font-normal text-foreground/60">(optional)</span>
        </label>
        <input
          id="department"
          name="department"
          type="text"
          defaultValue={isEdit ? (props.staff.department ?? "") : ""}
          className={inputClass}
        />
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create staff record"}
      </Button>
    </form>
  );
}
