"use client";

import { useActionState } from "react";
import type { GalleryItem, Media } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { createItem, updateItem, type ItemFormState } from "@/app/admin/gallery/actions";

const initialState: ItemFormState = { error: null };

const MEDIA_TYPE_OPTIONS = [
  { value: "IMAGE", label: "Image" },
  { value: "VIDEO", label: "Video" },
  { value: "DOCUMENT", label: "Document" },
];

type Props =
  | { mode: "create"; albumId: string }
  | { mode: "edit"; albumId: string; item: GalleryItem; media: Media };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function ItemForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit
    ? updateItem.bind(null, props.albumId, props.item.id)
    : createItem.bind(null, props.albumId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="url" className="text-sm font-medium text-foreground">
          File URL
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          placeholder="https://…"
          defaultValue={isEdit ? props.media.url : ""}
          className={inputClass}
        />
        <p className="text-xs text-foreground/50">
          A link to the hosted image/video/document — this system does not yet accept direct
          file uploads.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="mediaType" className="text-sm font-medium text-foreground">
            Media type
          </label>
          <select
            id="mediaType"
            name="mediaType"
            required
            defaultValue={isEdit ? props.media.mediaType : "IMAGE"}
            className={inputClass}
          >
            {MEDIA_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="caption" className="text-sm font-medium text-foreground">
            Caption <span className="font-normal text-foreground/50">(optional)</span>
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
          <label htmlFor="order" className="text-sm font-medium text-foreground">
            Display order <span className="font-normal text-foreground/50">(optional, defaults to 0)</span>
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
