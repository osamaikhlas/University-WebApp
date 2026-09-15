"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  generateComplianceReport,
  type GenerateReportState,
} from "@/app/admin/compliance/report-actions";

const initialState: GenerateReportState = { error: null };

/**
 * Freezes a snapshot of every requirement's current status/completeness into a new
 * `ComplianceReportExport` row, alongside the live website URL being reported to the Office
 * of the Inspector of Colleges. Generating a report is not itself the "submitted" event —
 * see the "Mark as submitted" action next to each row in the reports list.
 */
export function GenerateReportForm() {
  const [state, formAction, isPending] = useActionState(generateComplianceReport, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="websiteUrl" className="text-sm font-medium text-foreground">
          Live website URL
        </label>
        <input
          id="websiteUrl"
          name="websiteUrl"
          type="url"
          required
          placeholder="https://example-college.edu.pk"
          className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
      </div>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Generating…" : "Generate report"}
      </Button>
    </form>
  );
}
