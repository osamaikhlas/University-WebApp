"use client";

import { useActionState } from "react";
import type { Document } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { createDocument, updateDocument, type DocumentFormState } from "@/app/admin/documents/actions";

const initialState: DocumentFormState = { error: null };

type Props = { mode: "create" } | { mode: "edit"; document: Document };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function DocumentForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateDocument.bind(null, props.document.id) : createDocument;
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
            defaultValue={isEdit ? props.document.title : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className="text-sm font-medium text-foreground">
            Category <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="category"
            name="category"
            type="text"
            placeholder="e.g. Circular, Policy, Form"
            defaultValue={isEdit ? (props.document.category ?? "") : ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="fileUrl" className="text-sm font-medium text-foreground">
          File URL
        </label>
        <input
          id="fileUrl"
          name="fileUrl"
          type="url"
          required
          placeholder="https://…"
          defaultValue={isEdit ? props.document.fileUrl : ""}
          className={inputClass}
        />
        <p className="text-xs text-foreground/50">
          A link to the hosted file — this system does not yet accept direct file uploads.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mimeType" className="text-sm font-medium text-foreground">
            File type <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="mimeType"
            name="mimeType"
            type="text"
            placeholder="e.g. application/pdf"
            defaultValue={isEdit ? (props.document.mimeType ?? "") : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sizeBytes" className="text-sm font-medium text-foreground">
            Size (bytes) <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="sizeBytes"
            name="sizeBytes"
            type="number"
            min="0"
            step="1"
            defaultValue={isEdit ? (props.document.sizeBytes ?? "") : ""}
            className={inputClass}
          />
        </div>
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create document"}
      </Button>
    </form>
  );
}
