"use client";

import { useActionState } from "react";
import type { Notice } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { toDateInputValue } from "@/lib/admin/zod-helpers";
import { createNotice, updateNotice, type NoticeFormState } from "@/app/admin/notices/actions";

const initialState: NoticeFormState = { error: null };

type Props = { mode: "create" } | { mode: "edit"; notice: Notice };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function NoticeForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateNotice.bind(null, props.notice.id) : createNotice;
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
          defaultValue={isEdit ? props.notice.title : ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="body" className="text-sm font-medium text-foreground">
          Body
        </label>
        <textarea
          id="body"
          name="body"
          rows={6}
          required
          defaultValue={isEdit ? props.notice.body : ""}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className="text-sm font-medium text-foreground">
            Category <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="category"
            name="category"
            type="text"
            placeholder="e.g. general, exams"
            defaultValue={isEdit ? (props.notice.category ?? "") : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="publishDate" className="text-sm font-medium text-foreground">
            Publish date <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="publishDate"
            name="publishDate"
            type="date"
            defaultValue={isEdit ? toDateInputValue(props.notice.publishDate) : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="expiryDate" className="text-sm font-medium text-foreground">
            Expiry date <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="expiryDate"
            name="expiryDate"
            type="date"
            defaultValue={isEdit ? toDateInputValue(props.notice.expiryDate) : ""}
            className={inputClass}
          />
        </div>
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create notice"}
      </Button>
    </form>
  );
}
