"use client";

import { useActionState } from "react";
import type { GalleryItem, Media } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FilePreviewInput } from "@/components/admin/FilePreviewInput";
import { toDateInputValue } from "@/lib/admin/zod-helpers";
import { createItem, updateItem, type ItemFormState } from "@/app/admin/gallery/actions";

const initialState: ItemFormState = { error: null };

type Props =
  | { mode: "create"; albumId: string }
  | { mode: "edit"; albumId: string; item: GalleryItem; media: Media };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif";

export function ItemForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit
    ? updateItem.bind(null, props.albumId, props.item.id)
    : createItem.bind(null, props.albumId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="image" className="text-sm font-medium text-foreground">
          Image {isEdit ? <span className="font-normal text-foreground/60">(optional — replaces the current image)</span> : null}
        </label>
        <FilePreviewInput
          id="image"
          name="image"
          accept={ACCEPT}
          required={!isEdit}
          currentFileLabel={isEdit ? "current image" : undefined}
        />
        <p className="text-xs text-foreground/60">JPEG, PNG, WEBP, or GIF, up to 10MB.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="altText" className="text-sm font-medium text-foreground">
          Alt text
        </label>
        <input
          id="altText"
          name="altText"
          type="text"
          required
          placeholder="Describes the image for screen readers"
          defaultValue={isEdit ? props.media.altText : ""}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="caption" className="text-sm font-medium text-foreground">
            Caption <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <input
            id="caption"
            name="caption"
            type="text"
            defaultValue={isEdit ? (props.item.caption ?? "") : ""}
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
            placeholder="e.g. Convocation, Sports, Campus"
            defaultValue={isEdit ? (props.media.category ?? "") : ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mediaDate" className="text-sm font-medium text-foreground">
            Date <span className="font-normal text-foreground/60">(optional — when the photo was taken)</span>
          </label>
          <input
            id="mediaDate"
            name="mediaDate"
            type="date"
            defaultValue={isEdit ? toDateInputValue(props.media.mediaDate) : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="order" className="text-sm font-medium text-foreground">
            Display order <span className="font-normal text-foreground/60">(optional, defaults to 0)</span>
          </label>
          <input
            id="order"
            name="order"
            type="number"
            min="0"
            step="1"
            defaultValue={isEdit ? props.item.order : ""}
            className={inputClass}
          />
        </div>
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Add item"}
      </Button>
    </form>
  );
}
