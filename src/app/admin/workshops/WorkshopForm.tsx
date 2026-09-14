"use client";

import { useActionState } from "react";
import type { Department, Workshop } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { toDateInputValue } from "@/lib/admin/zod-helpers";
import { createWorkshop, updateWorkshop, type WorkshopFormState } from "@/app/admin/workshops/actions";

const initialState: WorkshopFormState = { error: null };

type Props =
  | { mode: "create"; departments: Department[] }
  | { mode: "edit"; workshop: Workshop; departments: Department[] };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function WorkshopForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateWorkshop.bind(null, props.workshop.id) : createWorkshop;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm font-medium text-foreground">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={isEdit ? props.workshop.title : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="facilitator" className="text-sm font-medium text-foreground">
            Facilitator <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="facilitator"
            name="facilitator"
            type="text"
            defaultValue={isEdit ? (props.workshop.facilitator ?? "") : ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="departmentId" className="text-sm font-medium text-foreground">
          Department <span className="font-normal text-foreground/50">(optional)</span>
        </label>
        <select
          id="departmentId"
          name="departmentId"
          defaultValue={isEdit ? (props.workshop.departmentId ?? "") : ""}
          className={inputClass}
        >
          <option value="">College-wide (no specific department)</option>
          {props.departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Description <span className="font-normal text-foreground/50">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={isEdit ? (props.workshop.description ?? "") : ""}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="startDate" className="text-sm font-medium text-foreground">
            Start date
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={isEdit ? toDateInputValue(props.workshop.startDate) : ""}
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
            defaultValue={isEdit ? toDateInputValue(props.workshop.endDate) : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="venue" className="text-sm font-medium text-foreground">
            Venue <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="venue"
            name="venue"
            type="text"
            defaultValue={isEdit ? (props.workshop.venue ?? "") : ""}
            className={inputClass}
          />
        </div>
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create workshop"}
      </Button>
    </form>
  );
}
