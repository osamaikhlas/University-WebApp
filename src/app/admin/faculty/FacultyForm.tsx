"use client";

import { useActionState } from "react";
import type { Department, Faculty } from "@prisma/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { createFaculty, updateFaculty, type FacultyFormState } from "@/app/admin/faculty/actions";

const initialState: FacultyFormState = { error: null };

type Props =
  | { mode: "create"; departments: Department[] }
  | { mode: "edit"; faculty: Faculty; departments: Department[] };

const inputClass =
  "rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function FacultyForm(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit ? updateFaculty.bind(null, props.faculty.id) : createFaculty;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={isEdit ? props.faculty.name : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="designation" className="text-sm font-medium text-foreground">
            Designation
          </label>
          <input
            id="designation"
            name="designation"
            type="text"
            required
            defaultValue={isEdit ? props.faculty.designation : ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="departmentId" className="text-sm font-medium text-foreground">
          Department
        </label>
        <select
          id="departmentId"
          name="departmentId"
          required
          defaultValue={isEdit ? props.faculty.departmentId : ""}
          className={inputClass}
        >
          <option value="" disabled>
            Select a department
          </option>
          {props.departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="qualifications" className="text-sm font-medium text-foreground">
          Qualifications <span className="font-normal text-foreground/50">(optional)</span>
        </label>
        <input
          id="qualifications"
          name="qualifications"
          type="text"
          defaultValue={isEdit ? (props.faculty.qualifications ?? "") : ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="subjectsTaught" className="text-sm font-medium text-foreground">
          Subjects taught <span className="font-normal text-foreground/50">(comma-separated, optional)</span>
        </label>
        <input
          id="subjectsTaught"
          name="subjectsTaught"
          type="text"
          placeholder="e.g. Data Structures, Algorithms"
          defaultValue={isEdit ? props.faculty.subjectsTaught.join(", ") : ""}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={isEdit ? (props.faculty.email ?? "") : ""}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-foreground">
            Phone <span className="font-normal text-foreground/50">(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="text"
            defaultValue={isEdit ? (props.faculty.phone ?? "") : ""}
            className={inputClass}
          />
        </div>
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : isEdit ? "Save changes" : "Create faculty record"}
      </Button>
    </form>
  );
}
