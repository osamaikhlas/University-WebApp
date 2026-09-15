"use client";

import { useActionState } from "react";
import type { Location } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { createLocation, updateLocation, type LocationFormState } from "@/app/admin/location/actions";

const initialState: LocationFormState = { error: null };

type Props = { mode: "create" } | { mode: "edit"; location: Location };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function LocationForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateLocation : createLocation;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="address" className="text-sm font-medium text-foreground">
          Address
        </label>
        <textarea
          id="address"
          name="address"
          rows={3}
          required
          defaultValue={isEdit ? props.location.address : ""}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="latitude" className="text-sm font-medium text-foreground">
            Latitude <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <input
            id="latitude"
            name="latitude"
            type="number"
            step="any"
            min="-90"
            max="90"
            defaultValue={isEdit ? (props.location.latitude ?? "") : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="longitude" className="text-sm font-medium text-foreground">
            Longitude <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <input
            id="longitude"
            name="longitude"
            type="number"
            step="any"
            min="-180"
            max="180"
            defaultValue={isEdit ? (props.location.longitude ?? "") : ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="mapEmbedUrl" className="text-sm font-medium text-foreground">
          Map embed URL <span className="font-normal text-foreground/60">(optional)</span>
        </label>
        <input
          id="mapEmbedUrl"
          name="mapEmbedUrl"
          type="url"
          placeholder="https://…"
          defaultValue={isEdit ? (props.location.mapEmbedUrl ?? "") : ""}
          className={inputClass}
        />
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create location"}
      </Button>
    </form>
  );
}
