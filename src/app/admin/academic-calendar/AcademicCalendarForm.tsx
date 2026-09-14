"use client";

import { useActionState } from "react";
import type { AcademicCalendar } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { toDateInputValue } from "@/lib/admin/zod-helpers";
import {
  createAcademicCalendarEntry,
  updateAcademicCalendarEntry,
  type AcademicCalendarFormState,
} from "@/app/admin/academic-calendar/actions";

const initialState: AcademicCalendarFormState = { error: null };

type Props = { mode: "create" } | { mode: "edit"; entry: AcademicCalendar };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function AcademicCalendarForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit
    ? updateAcademicCalendarEntry.bind(null, props.entry.id)
    : createAcademicCalendarEntry;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium text-foreground">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={isEdit ? props.entry.title : ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Description <span className="font-normal text-foreground/50">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={isEdit ? (props.entry.description ?? "") : ""}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="startDate" className="text-sm font-medium text-foreground">
            Start date
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={isEdit ? toDateInputValue(props.entry.startDate) : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="endDate" className="text-sm font-medium text-foreground">
            End date <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={isEdit ? toDateInputValue(props.entry.endDate) : ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className="text-sm font-medium text-foreground">
            Category <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="category"
            name="category"
            type="text"
            placeholder="e.g. exam, holiday, semester"
            defaultValue={isEdit ? (props.entry.category ?? "") : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="academicYear" className="text-sm font-medium text-foreground">
            Academic year <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="academicYear"
            name="academicYear"
            type="text"
            placeholder="e.g. 2026-2027"
            defaultValue={isEdit ? (props.entry.academicYear ?? "") : ""}
            className={inputClass}
          />
        </div>
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create calendar entry"}
      </Button>
    </form>
  );
}
