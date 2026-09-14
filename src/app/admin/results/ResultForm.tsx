"use client";

import { useActionState } from "react";
import type { Examination, Program, Result } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { toDateInputValue } from "@/lib/admin/zod-helpers";
import { createResult, updateResult, type ResultFormState } from "@/app/admin/results/actions";

const initialState: ResultFormState = { error: null };

type Props =
  | { mode: "create"; programs: Program[]; examinations: Examination[] }
  | { mode: "edit"; result: Result; programs: Program[]; examinations: Examination[] };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function ResultForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateResult.bind(null, props.result.id) : createResult;
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
            defaultValue={isEdit ? props.result.programId : ""}
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
          <label htmlFor="examinationId" className="text-sm font-medium text-foreground">
            Examination
          </label>
          <select
            id="examinationId"
            name="examinationId"
            required
            defaultValue={isEdit ? props.result.examinationId : ""}
            className={inputClass}
          >
            <option value="" disabled>
              Select an examination
            </option>
            {props.examinations.map((examination) => (
              <option key={examination.id} value={examination.id}>
                {examination.examType}
                {examination.academicYear ? ` (${examination.academicYear})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="publishDate" className="text-sm font-medium text-foreground">
            Publish date <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="publishDate"
            name="publishDate"
            type="date"
            defaultValue={isEdit ? toDateInputValue(props.result.publishDate) : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="externalLink" className="text-sm font-medium text-foreground">
            External link <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="externalLink"
            name="externalLink"
            type="url"
            placeholder="https://…"
            defaultValue={isEdit ? (props.result.externalLink ?? "") : ""}
            className={inputClass}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <input
          id="isPublic"
          name="isPublic"
          type="checkbox"
          defaultChecked={isEdit ? props.result.isPublic : false}
          className="h-4 w-4 rounded border-border-subtle"
        />
        Publicly visible once published
      </label>
      <p className="-mt-2 text-xs text-foreground/50">
        A result only appears on the public Results page once it is both PUBLISHED and marked
        publicly visible — two independent gates, so a published-but-restricted result never
        leaks (e.g. results shared only via the external link).
      </p>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create result"}
      </Button>
    </form>
  );
}
