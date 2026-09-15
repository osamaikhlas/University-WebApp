"use client";

import { useActionState } from "react";
import type { Document } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FilePreviewInput } from "@/components/admin/FilePreviewInput";
import { toDateInputValue } from "@/lib/admin/zod-helpers";
import { createDocument, updateDocument, type DocumentFormState } from "@/app/admin/documents/actions";

const initialState: DocumentFormState = { error: null };

type Props = { mode: "create" } | { mode: "edit"; document: Document };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,image/jpeg,image/png";

export function DocumentForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateDocument.bind(null, props.document.id) : createDocument;
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
          defaultValue={isEdit ? props.document.title : ""}
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
          rows={3}
          defaultValue={isEdit ? (props.document.description ?? "") : ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category" className="text-sm font-medium text-foreground">
          Category <span className="font-normal text-foreground/60">(optional)</span>
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="file" className="text-sm font-medium text-foreground">
          File {isEdit ? <span className="font-normal text-foreground/60">(optional — replaces the current file)</span> : null}
        </label>
        <FilePreviewInput
          id="file"
          name="file"
          accept={ACCEPT}
          required={!isEdit}
          currentFileLabel={isEdit ? (props.document.fileName ?? undefined) : undefined}
        />
        <p className="text-xs text-foreground/60">PDF, DOC(X), XLS(X), PPT(X), TXT, JPEG, or PNG, up to 25MB.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="publishDate" className="text-sm font-medium text-foreground">
            Publish date <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <input
            id="publishDate"
            name="publishDate"
            type="date"
            defaultValue={isEdit ? toDateInputValue(props.document.publishDate) : ""}
            className={inputClass}
          />
          <p className="text-xs text-foreground/60">
            Leave blank to make it visible as soon as it&apos;s published.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="expiryDate" className="text-sm font-medium text-foreground">
            Expiry date <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <input
            id="expiryDate"
            name="expiryDate"
            type="date"
            defaultValue={isEdit ? toDateInputValue(props.document.expiryDate) : ""}
            className={inputClass}
          />
          <p className="text-xs text-foreground/60">
            Automatically stops appearing on the public site after this date.
          </p>
        </div>
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Upload document"}
      </Button>
    </form>
  );
}
