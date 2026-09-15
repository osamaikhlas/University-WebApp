"use client";

import { useActionState } from "react";
import type { EnrollmentStatistic, Program } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  createEnrollmentStatistic,
  updateEnrollmentStatistic,
  type EnrollmentStatisticFormState,
} from "@/app/admin/enrollment-statistics/actions";

const initialState: EnrollmentStatisticFormState = { error: null };

type Props =
  | { mode: "create"; programs: Program[] }
  | { mode: "edit"; enrollmentStatistic: EnrollmentStatistic; programs: Program[] };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function EnrollmentStatisticForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit
    ? updateEnrollmentStatistic.bind(null, props.enrollmentStatistic.id)
    : createEnrollmentStatistic;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="programId" className="text-sm font-medium text-foreground">
            Program
          </label>
          <select
            id="programId"
            name="programId"
            required
            defaultValue={isEdit ? props.enrollmentStatistic.programId : ""}
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
            defaultValue={isEdit ? props.enrollmentStatistic.academicYear : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sessionType" className="text-sm font-medium text-foreground">
            Session <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <input
            id="sessionType"
            name="sessionType"
            type="text"
            placeholder="e.g. Fall, Spring"
            defaultValue={isEdit ? (props.enrollmentStatistic.sessionType ?? "") : ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="totalEnrolled" className="text-sm font-medium text-foreground">
            Total enrolled
          </label>
          <input
            id="totalEnrolled"
            name="totalEnrolled"
            type="number"
            min="0"
            step="1"
            required
            defaultValue={isEdit ? props.enrollmentStatistic.totalEnrolled : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="maleCount" className="text-sm font-medium text-foreground">
            Male <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <input
            id="maleCount"
            name="maleCount"
            type="number"
            min="0"
            step="1"
            defaultValue={isEdit ? (props.enrollmentStatistic.maleCount ?? "") : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="femaleCount" className="text-sm font-medium text-foreground">
            Female <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <input
            id="femaleCount"
            name="femaleCount"
            type="number"
            min="0"
            step="1"
            defaultValue={isEdit ? (props.enrollmentStatistic.femaleCount ?? "") : ""}
            className={inputClass}
          />
        </div>
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create enrollment statistic"}
      </Button>
    </form>
  );
}
