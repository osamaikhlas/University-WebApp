"use client";

import { useActionState } from "react";
import type { Program, Timetable } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { toDateInputValue } from "@/lib/admin/zod-helpers";
import { createTimetable, updateTimetable, type TimetableFormState } from "@/app/admin/timetables/actions";

const initialState: TimetableFormState = { error: null };

type Props =
  | { mode: "create"; programs: Program[] }
  | { mode: "edit"; timetable: Timetable; programs: Program[] };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function TimetableForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateTimetable.bind(null, props.timetable.id) : createTimetable;
  const [state, formAction, isPending] = useActionState(action, initialState);

  const scheduleDefault =
    isEdit && props.timetable.structuredSchedule != null
      ? JSON.stringify(props.timetable.structuredSchedule, null, 2)
      : "";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="programId" className="text-sm font-medium text-foreground">
          Program
        </label>
        <select
          id="programId"
          name="programId"
          required
          defaultValue={isEdit ? props.timetable.programId : ""}
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="classGroup" className="text-sm font-medium text-foreground">
            Class / Section
          </label>
          <input
            id="classGroup"
            name="classGroup"
            type="text"
            required
            placeholder="e.g. Semester 1 - Section A"
            defaultValue={isEdit ? props.timetable.classGroup : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="effectiveFrom" className="text-sm font-medium text-foreground">
            Effective from
          </label>
          <input
            id="effectiveFrom"
            name="effectiveFrom"
            type="date"
            required
            defaultValue={isEdit ? toDateInputValue(props.timetable.effectiveFrom) : ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="structuredSchedule" className="text-sm font-medium text-foreground">
          Schedule (JSON) <span className="font-normal text-foreground/50">(optional)</span>
        </label>
        <textarea
          id="structuredSchedule"
          name="structuredSchedule"
          rows={8}
          placeholder={'e.g. {"monday": [{"time": "09:00", "course": "SAMP-101"}]}'}
          defaultValue={scheduleDefault}
          className={`${inputClass} font-mono text-xs`}
        />
        <p className="text-xs text-foreground/50">
          Optional structured schedule data, as JSON. Leave blank if not needed yet.
        </p>
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create timetable"}
      </Button>
    </form>
  );
}
