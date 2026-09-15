"use client";

import { useActionState } from "react";
import type { Affiliation, Program } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { toDateInputValue } from "@/lib/admin/zod-helpers";
import { createAffiliation, updateAffiliation, type AffiliationFormState } from "@/app/admin/affiliation/actions";

const initialState: AffiliationFormState = { error: null };

type Props =
  | { mode: "create"; programs: Program[] }
  | { mode: "edit"; affiliation: Affiliation; programs: Program[] };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function AffiliationForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateAffiliation.bind(null, props.affiliation.id) : createAffiliation;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="universityName" className="text-sm font-medium text-foreground">
            University name
          </label>
          <input
            id="universityName"
            name="universityName"
            type="text"
            required
            defaultValue={isEdit ? props.affiliation.universityName : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="programId" className="text-sm font-medium text-foreground">
            Program <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <select
            id="programId"
            name="programId"
            defaultValue={isEdit ? (props.affiliation.programId ?? "") : ""}
            className={inputClass}
          >
            <option value="">College-wide (no specific program)</option>
            {props.programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="affiliationNumber" className="text-sm font-medium text-foreground">
            Affiliation number <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <input
            id="affiliationNumber"
            name="affiliationNumber"
            type="text"
            defaultValue={isEdit ? (props.affiliation.affiliationNumber ?? "") : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="regulatoryBody" className="text-sm font-medium text-foreground">
            Regulatory body <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <input
            id="regulatoryBody"
            name="regulatoryBody"
            type="text"
            placeholder="e.g. Higher Education Commission"
            defaultValue={isEdit ? (props.affiliation.regulatoryBody ?? "") : ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="validFrom" className="text-sm font-medium text-foreground">
            Valid from <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <input
            id="validFrom"
            name="validFrom"
            type="date"
            defaultValue={isEdit ? toDateInputValue(props.affiliation.validFrom) : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="validTo" className="text-sm font-medium text-foreground">
            Valid to <span className="font-normal text-foreground/60">(optional)</span>
          </label>
          <input
            id="validTo"
            name="validTo"
            type="date"
            defaultValue={isEdit ? toDateInputValue(props.affiliation.validTo) : ""}
            className={inputClass}
          />
        </div>
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create affiliation"}
      </Button>
    </form>
  );
}
