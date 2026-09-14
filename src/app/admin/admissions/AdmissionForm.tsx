"use client";

import { useActionState } from "react";
import type { Admission, Program } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { toDateInputValue } from "@/lib/admin/zod-helpers";
import { createAdmission, updateAdmission, type AdmissionFormState } from "@/app/admin/admissions/actions";

const initialState: AdmissionFormState = { error: null };

type Props =
  | { mode: "create"; programs: Program[] }
  | { mode: "edit"; admission: Admission; programs: Program[] };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function AdmissionForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateAdmission.bind(null, props.admission.id) : createAdmission;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="programId" className="text-sm font-medium text-foreground">
            Program
          </label>
          <select
            id="programId"
            name="programId"
            required
            defaultValue={isEdit ? props.admission.programId : ""}
            className={inputClass}
          >
            <option value="" disabled>
              Select a program
            </option>
            {props.programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="academicYear" className="text-sm font-medium text-foreground">
            Academic year
          </label>
          <input
            id="academicYear"
            name="academicYear"
            type="text"
            required
            placeholder="e.g. 2026-2027"
            defaultValue={isEdit ? props.admission.academicYear : ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="eligibilityCriteria" className="text-sm font-medium text-foreground">
          Eligibility criteria <span className="font-normal text-foreground/50">(optional)</span>
        </label>
        <textarea
          id="eligibilityCriteria"
          name="eligibilityCriteria"
          rows={4}
          defaultValue={isEdit ? (props.admission.eligibilityCriteria ?? "") : ""}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="applicationStartDate" className="text-sm font-medium text-foreground">
            Application start date <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="applicationStartDate"
            name="applicationStartDate"
            type="date"
            defaultValue={isEdit ? toDateInputValue(props.admission.applicationStartDate) : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="applicationEndDate" className="text-sm font-medium text-foreground">
            Application end date <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="applicationEndDate"
            name="applicationEndDate"
            type="date"
            defaultValue={isEdit ? toDateInputValue(props.admission.applicationEndDate) : ""}
            className={inputClass}
          />
        </div>
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create admission cycle"}
      </Button>
    </form>
  );
}
