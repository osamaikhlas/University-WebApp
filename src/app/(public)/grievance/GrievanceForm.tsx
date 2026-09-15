"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { GRIEVANCE_CATEGORIES } from "@/lib/grievance-categories";
import { submitGrievance, type GrievanceFormState } from "@/app/(public)/grievance/actions";

const initialState: GrievanceFormState = { status: "idle", error: null };

export function GrievanceForm() {
  const [state, formAction, isPending] = useActionState(submitGrievance, initialState);

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success" title="Grievance submitted">
          Thank you — your grievance has been recorded confidentially. It is not publicly
          listed anywhere on this site; only authorized staff can view it.
        </Alert>
        {state.referenceNumber ? (
          <Alert tone="info" title="Your reference number">
            <p className="font-mono text-base font-semibold">{state.referenceNumber}</p>
            <p className="mt-1">
              Please save this number — quote it in any follow-up correspondence with the
              college about this grievance.
            </p>
          </Alert>
        ) : null}
        {state.warning ? <Alert tone="warning">{state.warning}</Alert> : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-xs text-foreground/60">
        Contact details are encrypted before storage and are only used to follow up on this
        grievance — they are never published or shared.
      </p>

      {/* Honeypot — hidden from real users via CSS, never a visible/labelled form control, so
          only an automated filler would ever populate it (src/app/(public)/grievance/actions.ts).
          The input itself (not just its wrapper) is zero-size and clipped, so an
          accessibility/automation check of the input's own bounding box — not just its
          ancestor's — reports it as hidden too. */}
      <div className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Leave this field blank</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          className="absolute h-0 w-0 overflow-hidden border-0 p-0"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="submitterName" className="text-sm font-medium text-foreground">
          Name
        </label>
        <input
          id="submitterName"
          name="submitterName"
          type="text"
          required
          maxLength={200}
          className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="submitterEmail" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="submitterEmail"
          name="submitterEmail"
          type="email"
          required
          autoComplete="off"
          maxLength={200}
          className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="submitterPhone" className="text-sm font-medium text-foreground">
          Phone <span className="font-normal text-foreground/60">(optional)</span>
        </label>
        <input
          id="submitterPhone"
          name="submitterPhone"
          type="tel"
          autoComplete="off"
          maxLength={50}
          className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category" className="text-sm font-medium text-foreground">
          Category
        </label>
        <select
          id="category"
          name="category"
          required
          defaultValue=""
          className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <option value="" disabled>
            Select a category
          </option>
          {GRIEVANCE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="subject" className="text-sm font-medium text-foreground">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          maxLength={300}
          className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="attachment" className="text-sm font-medium text-foreground">
          Attachment <span className="font-normal text-foreground/60">(optional)</span>
        </label>
        <input
          id="attachment"
          name="attachment"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          className="text-sm file:mr-3 file:rounded-md file:border file:border-border-subtle file:bg-surface-muted file:px-3 file:py-1.5 file:text-sm"
        />
        <p className="text-xs text-foreground/60">
          PDF, JPEG, PNG, WEBP, DOC, or DOCX, up to 10MB.
        </p>
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
