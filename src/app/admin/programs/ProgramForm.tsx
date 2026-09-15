"use client";

import { useActionState } from "react";
import type { Department, Program } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { createProgram, updateProgram, type ProgramFormState } from "@/app/admin/programs/actions";

const initialState: ProgramFormState = { error: null };

const LEVEL_OPTIONS = ["UNDERGRADUATE", "GRADUATE", "DIPLOMA", "CERTIFICATE"] as const;

type Props =
  | { mode: "create"; departments: Department[] }
  | { mode: "edit"; program: Program; departments: Department[] };

export function ProgramForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateProgram.bind(null, props.program.id) : createProgram;
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
          defaultValue={isEdit ? props.program.name : ""}
          className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="departmentId" className="text-sm font-medium text-foreground">
          Department
        </label>
        <select
          id="departmentId"
          name="departmentId"
          required
          defaultValue={isEdit ? props.program.departmentId : ""}
          className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <option value="" disabled>
            Select a department
          </option>
          {props.departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="level" className="text-sm font-medium text-foreground">
            Level
          </label>
          <select
            id="level"
            name="level"
            required
            defaultValue={isEdit ? props.program.level : ""}
            className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <option value="" disabled>
              Select a level
            </option>
            {LEVEL_OPTIONS.map((level) => (
              <option key={level} value={level}>
                {level.charAt(0) + level.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="durationYears" className="text-sm font-medium text-foreground">
            Duration (years)
          </label>
          <input
            id="durationYears"
            name="durationYears"
            type="number"
            min={1}
            max={10}
            required
            defaultValue={isEdit ? props.program.durationYears : 4}
            className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Description <span className="font-normal text-foreground/60">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={isEdit ? (props.program.description ?? "") : ""}
          className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create program"}
      </Button>
    </form>
  );
}
