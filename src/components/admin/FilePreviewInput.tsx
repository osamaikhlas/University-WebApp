"use client";

import { useState } from "react";

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand file:mr-3 file:rounded-md file:border file:border-border-subtle file:bg-surface-muted file:px-3 file:py-1.5 file:text-sm";

/**
 * A file `<input>` with an immediate client-side preview of whatever the user just picked —
 * before it's ever uploaded — so a mis-selected file (wrong page scanned, wrong photo) is
 * obvious before submitting. Purely a UX aid: the actual accept/size/type validation that
 * matters happens server-side in src/lib/security/upload-storage.ts regardless of what this
 * shows or allows client-side (CLAUDE.md rule 5 — never trust the client alone).
 */
export function FilePreviewInput({
  id,
  name,
  accept,
  required,
  currentFileLabel,
}: {
  id: string;
  name: string;
  accept: string;
  required?: boolean;
  /** Shown when editing an existing record with a file already on disk — e.g. its file name. */
  currentFileLabel?: string;
}) {
  const [preview, setPreview] = useState<{ fileName: string; imageUrl: string | null } | null>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setPreview(null);
      return;
    }
    setPreview({
      fileName: file.name,
      imageUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        onChange={handleChange}
        className={inputClass}
      />
      {preview ? (
        <div className="flex items-center gap-3 rounded-md border border-border-subtle p-2 text-sm">
          {preview.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob: preview URL, never a remote/Next-Image-eligible source
            <img
              src={preview.imageUrl}
              alt="Selected file preview"
              className="h-16 w-16 rounded object-cover"
            />
          ) : (
            <span aria-hidden className="text-2xl">
              📄
            </span>
          )}
          <span className="text-foreground/80">{preview.fileName}</span>
        </div>
      ) : currentFileLabel ? (
        <p className="text-xs text-foreground/60">
          Current file: <span className="font-medium">{currentFileLabel}</span>. Choose a new
          file above to replace it, or leave this blank to keep it.
        </p>
      ) : null}
    </div>
  );
}
