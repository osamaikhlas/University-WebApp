"use client";

import { useActionState } from "react";
import type { Event } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { toDateInputValue } from "@/lib/admin/zod-helpers";
import { createEvent, updateEvent, type EventFormState } from "@/app/admin/events/actions";

const initialState: EventFormState = { error: null };

type Props = { mode: "create" } | { mode: "edit"; event: Event };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function EventForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateEvent.bind(null, props.event.id) : createEvent;
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
          defaultValue={isEdit ? props.event.title : ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Description <span className="font-normal text-foreground/60">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={isEdit ? (props.event.description ?? "") : ""}
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
            defaultValue={isEdit ? toDateInputValue(props.event.startDate) : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="endDate" className="text-sm font-medium text-foreground">
            End date <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={isEdit ? toDateInputValue(props.event.endDate) : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="location" className="text-sm font-medium text-foreground">
            Location <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <input
            id="location"
            name="location"
            type="text"
            defaultValue={isEdit ? (props.event.location ?? "") : ""}
            className={inputClass}
          />
        </div>
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create event"}
      </Button>
    </form>
  );
}
