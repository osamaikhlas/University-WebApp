"use client";

import { useActionState } from "react";
import type { CollegeProfile } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  createCollegeProfile,
  updateCollegeProfile,
  type CollegeProfileFormState,
} from "@/app/admin/college-profile/actions";

const initialState: CollegeProfileFormState = { error: null };

type Props = {
  mode: "create" | "edit";
  profile?: CollegeProfile;
  logoUrl?: string | null;
  principalPhotoUrl?: string | null;
};

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const fileInputClass =
  "text-sm text-foreground/70 file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-foreground";

export function CollegeProfileForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateCollegeProfile : createCollegeProfile;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const profile = isEdit ? (props.profile ?? null) : null;

  return (
    <form action={formAction} className="flex flex-col gap-4" encType="multipart/form-data">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="logo" className="text-sm font-medium text-foreground">
            Site logo <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          {props.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={props.logoUrl}
              alt="Current site logo"
              className="h-16 w-16 rounded-md border border-border-subtle object-contain"
            />
          ) : null}
          <input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={fileInputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="principalPhoto" className="text-sm font-medium text-foreground">
            Principal&apos;s photo <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          {props.principalPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={props.principalPhotoUrl}
              alt="Current principal photo"
              className="h-16 w-16 rounded-full border border-border-subtle object-cover"
            />
          ) : null}
          <input
            id="principalPhoto"
            name="principalPhoto"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className={fileInputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="overview" className="text-sm font-medium text-foreground">
          Overview <span className="font-normal text-foreground/60">(optional)</span>
        </label>
        <textarea
          id="overview"
          name="overview"
          rows={4}
          defaultValue={profile?.overview ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="visionStatement" className="text-sm font-medium text-foreground">
            Vision <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <textarea
            id="visionStatement"
            name="visionStatement"
            rows={3}
            defaultValue={profile?.visionStatement ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="missionStatement" className="text-sm font-medium text-foreground">
            Mission <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <textarea
            id="missionStatement"
            name="missionStatement"
            rows={3}
            defaultValue={profile?.missionStatement ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="history" className="text-sm font-medium text-foreground">
          History <span className="font-normal text-foreground/60">(optional)</span>
        </label>
        <textarea
          id="history"
          name="history"
          rows={4}
          defaultValue={profile?.history ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="principalName" className="text-sm font-medium text-foreground">
            Principal&apos;s name <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <input
            id="principalName"
            name="principalName"
            type="text"
            defaultValue={profile?.principalName ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="establishedYear" className="text-sm font-medium text-foreground">
            Established year <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <input
            id="establishedYear"
            name="establishedYear"
            type="number"
            min={1800}
            max={2100}
            defaultValue={profile?.establishedYear ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="principalMessage" className="text-sm font-medium text-foreground">
          Principal&apos;s message <span className="font-normal text-foreground/60">(optional)</span>
        </label>
        <textarea
          id="principalMessage"
          name="principalMessage"
          rows={4}
          defaultValue={profile?.principalMessage ?? ""}
          className={inputClass}
        />
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create college profile"}
      </Button>
    </form>
  );
}
