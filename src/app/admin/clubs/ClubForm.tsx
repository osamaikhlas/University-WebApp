"use client";

import { useActionState } from "react";
import type { Club, Faculty } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { createClub, updateClub, type ClubFormState } from "@/app/admin/clubs/actions";

const initialState: ClubFormState = { error: null };

type Props =
  | { mode: "create"; facultyMembers: Faculty[] }
  | { mode: "edit"; club: Club; facultyMembers: Faculty[] };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function ClubForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateClub.bind(null, props.club.id) : createClub;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={isEdit ? props.club.name : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="facultyAdvisorId" className="text-sm font-medium text-foreground">
            Faculty advisor <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <select
            id="facultyAdvisorId"
            name="facultyAdvisorId"
            defaultValue={isEdit ? (props.club.facultyAdvisorId ?? "") : ""}
            className={inputClass}
          >
            <option value="">No advisor assigned</option>
            {props.facultyMembers.map((faculty) => (
              <option key={faculty.id} value={faculty.id}>
                {faculty.name}
              </option>
            ))}
          </select>
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
          defaultValue={isEdit ? (props.club.description ?? "") : ""}
          className={inputClass}
        />
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create club"}
      </Button>
    </form>
  );
}
