"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { submitGrievance, type GrievanceFormState } from "@/app/(public)/grievance/actions";

const CATEGORIES = ["Academic", "Administrative", "Faculty", "Facilities", "Harassment", "Other"];

const initialState: GrievanceFormState = { status: "idle", error: null };

export function GrievanceForm() {
  const [state, formAction, isPending] = useActionState(submitGrievance, initialState);

  if (state.status === "success") {
    return (
      <Alert tone="success" title="Grievance submitted">
        Thank you — your grievance has been recorded confidentially. It is not publicly
        listed anywhere on this site.
      </Alert>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-xs text-foreground/60">
        Fields marked optional may be left blank to submit anonymously. Contact details, if
        given, are encrypted before storage and are only used to follow up on this
        grievance.
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="submitterName" className="text-sm font-medium text-foreground">
          Name <span className="font-normal text-foreground/50">(optional)</span>
        </label>
        <input
          id="submitterName"
          name="submitterName"
          type="text"
          className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="submitterContact" className="text-sm font-medium text-foreground">
          Contact (email or phone) <span className="font-normal text-foreground/50">(optional)</span>
        </label>
        <input
          id="submitterContact"
          name="submitterContact"
          type="text"
          autoComplete="off"
          className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category" className="text-sm font-medium text-foreground">
          Category <span className="font-normal text-foreground/50">(optional)</span>
        </label>
        <select
          id="category"
          name="category"
          defaultValue=""
          className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={5}
          className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
      </div>

      {state.status === "error" && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Submitting…" : "Submit grievance"}
      </Button>
    </form>
  );
}
