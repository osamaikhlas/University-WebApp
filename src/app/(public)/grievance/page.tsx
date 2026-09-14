import type { Metadata } from "next";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { GrievanceForm } from "@/app/(public)/grievance/GrievanceForm";

// Always render per-request: this page reads live, publish-gated content from the
// database (CLAUDE.md rule 4), so a stale statically-prerendered build must never be
// served here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Grievance",
};

export default function GrievancePage() {
  return (
    <PublicPageShell
      title="Grievance"
      description="A confidential way to raise a concern with the college."
    >
      <div className="flex flex-col gap-6">
        <Alert tone="info" title="Confidential">
          Grievance submissions are private by default. They are never published on this
          site or shown to anyone other than authorized staff reviewing grievances.
        </Alert>
        <Card>
          <GrievanceForm />
        </Card>
      </div>
    </PublicPageShell>
  );
}
