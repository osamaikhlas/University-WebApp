"use client";

import { useActionState } from "react";
import type { Admission, FeeStructure, Program } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  createFeeStructure,
  updateFeeStructure,
  type FeeStructureFormState,
} from "@/app/admin/fee-structures/actions";

const initialState: FeeStructureFormState = { error: null };

/**
 * Prisma's `Decimal` (amount) is a class instance, not a plain serializable value, so it
 * can't cross the Server Component -> Client Component boundary as-is — the page passes it
 * in already converted to a plain string.
 */
type FeeStructureView = Omit<FeeStructure, "amount"> & { amount: string };

type Props =
  | { mode: "create"; programs: Program[]; admissions: Admission[] }
  | { mode: "edit"; feeStructure: FeeStructureView; programs: Program[]; admissions: Admission[] };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function FeeStructureForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateFeeStructure.bind(null, props.feeStructure.id) : createFeeStructure;
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
            defaultValue={isEdit ? props.feeStructure.programId : ""}
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
          <label htmlFor="admissionId" className="text-sm font-medium text-foreground">
            Admission cycle <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <select
            id="admissionId"
            name="admissionId"
            defaultValue={isEdit ? (props.feeStructure.admissionId ?? "") : ""}
            className={inputClass}
          >
            <option value="">Not linked to a specific admission cycle</option>
            {props.admissions.map((admission) => (
              <option key={admission.id} value={admission.id}>
                {admission.academicYear}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
            defaultValue={isEdit ? props.feeStructure.academicYear : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="feeType" className="text-sm font-medium text-foreground">
            Fee type
          </label>
          <input
            id="feeType"
            name="feeType"
            type="text"
            required
            placeholder="e.g. Tuition, Admission, Lab"
            defaultValue={isEdit ? props.feeStructure.feeType : ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="amount" className="text-sm font-medium text-foreground">
            Amount
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={isEdit ? props.feeStructure.amount : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="currency" className="text-sm font-medium text-foreground">
            Currency <span className="font-normal text-foreground/60">(optional, defaults to PKR)</span>
          </label>
          <input
            id="currency"
            name="currency"
            type="text"
            placeholder="PKR"
            defaultValue={isEdit ? props.feeStructure.currency : ""}
            className={inputClass}
          />
        </div>
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create fee structure"}
      </Button>
    </form>
  );
}
