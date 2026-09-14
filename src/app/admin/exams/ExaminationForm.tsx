"use client";

import { useActionState } from "react";
import type { Examination, Notice, Program } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { toDateInputValue } from "@/lib/admin/zod-helpers";
import { createExamination, updateExamination, type ExaminationFormState } from "@/app/admin/exams/actions";

const initialState: ExaminationFormState = { error: null };

type Props =
  | { mode: "create"; programs: Program[]; notices: Notice[] }
  | { mode: "edit"; examination: Examination; programs: Program[]; notices: Notice[] };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function ExaminationForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateExamination.bind(null, props.examination.id) : createExamination;
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
            defaultValue={isEdit ? props.examination.programId : ""}
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
          <label htmlFor="examType" className="text-sm font-medium text-foreground">
            Exam type
          </label>
          <input
            id="examType"
            name="examType"
            type="text"
            required
            placeholder="e.g. Mid-term, Final"
            defaultValue={isEdit ? props.examination.examType : ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="academicYear" className="text-sm font-medium text-foreground">
            Academic year <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="academicYear"
            name="academicYear"
            type="text"
            placeholder="e.g. 2026-2027"
            defaultValue={isEdit ? (props.examination.academicYear ?? "") : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="noticeId" className="text-sm font-medium text-foreground">
            Linked notice <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <select
            id="noticeId"
            name="noticeId"
            defaultValue={isEdit ? (props.examination.noticeId ?? "") : ""}
            className={inputClass}
          >
            <option value="">No linked notice</option>
            {props.notices.map((notice) => (
              <option key={notice.id} value={notice.id}>
                {notice.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="scheduleStartDate" className="text-sm font-medium text-foreground">
            Schedule start date <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="scheduleStartDate"
            name="scheduleStartDate"
            type="date"
            defaultValue={isEdit ? toDateInputValue(props.examination.scheduleStartDate) : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="scheduleEndDate" className="text-sm font-medium text-foreground">
            Schedule end date <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="scheduleEndDate"
            name="scheduleEndDate"
            type="date"
            defaultValue={isEdit ? toDateInputValue(props.examination.scheduleEndDate) : ""}
            className={inputClass}
          />
        </div>
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create examination"}
      </Button>
    </form>
  );
}
