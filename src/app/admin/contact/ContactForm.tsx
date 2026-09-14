"use client";

import { useActionState } from "react";
import type { Contact } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { createContact, updateContact, type ContactFormState } from "@/app/admin/contact/actions";

const initialState: ContactFormState = { error: null };

const TYPE_OPTIONS = [
  { value: "PHONE", label: "Phone" },
  { value: "EMAIL", label: "Email" },
  { value: "OTHER", label: "Other" },
];

type Props = { mode: "create" } | { mode: "edit"; contact: Contact };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function ContactForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateContact.bind(null, props.contact.id) : createContact;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="type" className="text-sm font-medium text-foreground">
            Type
          </label>
          <select
            id="type"
            name="type"
            required
            defaultValue={isEdit ? props.contact.type : ""}
            className={inputClass}
          >
            <option value="" disabled>
              Select a type
            </option>
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="value" className="text-sm font-medium text-foreground">
            Value
          </label>
          <input
            id="value"
            name="value"
            type="text"
            required
            placeholder="e.g. +92-XXX-XXXXXXX or info@college.edu.pk"
            defaultValue={isEdit ? props.contact.value : ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="label" className="text-sm font-medium text-foreground">
          Label <span className="font-normal text-foreground/50">(optional)</span>
        </label>
        <input
          id="label"
          name="label"
          type="text"
          placeholder="e.g. Admissions Office"
          defaultValue={isEdit ? (props.contact.label ?? "") : ""}
          className={inputClass}
        />
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create contact"}
      </Button>
    </form>
  );
}
