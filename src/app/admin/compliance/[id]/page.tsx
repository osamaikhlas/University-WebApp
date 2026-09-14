import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { hasPermission } from "@/lib/auth/permissions";
import { getComplianceRequirementDetail } from "@/lib/compliance";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { ComplianceStatusBadge } from "@/components/admin/ComplianceStatusBadge";
import { ComplianceActions } from "@/components/admin/ComplianceActions";
import { EvidenceForm } from "@/app/admin/compliance/EvidenceForm";
import { transitionRequirement } from "@/app/admin/compliance/actions";

export const metadata: Metadata = { title: "Compliance requirement" };

const DECISION_LABELS: Record<string, string> = {
  VERIFIED: "Verified",
  NEEDS_UPDATE: "Needs update",
};

export default async function ComplianceRequirementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workflowError?: string }>;
}) {
  const user = await requirePermission("compliance:view");
  const { id } = await params;
  const { workflowError } = await searchParams;

  const requirement = await getComplianceRequirementDetail(id);
  if (!requirement) notFound();

  const canView = hasPermission(user.permissions, "compliance:view");
  const canVerify = hasPermission(user.permissions, "compliance:verify");

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading
            title={`#${requirement.itemNumber} — ${requirement.title}`}
            description={requirement.circularReference}
          />
          <ComplianceStatusBadge status={requirement.status} />
        </div>

        <Card>
          <dl className="flex flex-col gap-4 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap">{requirement.description}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Required records</dt>
              <dd className="mt-1 whitespace-pre-wrap">{requirement.rule.requiredRecords}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Required fields</dt>
              <dd className="mt-1 whitespace-pre-wrap">{requirement.rule.requiredFields}</dd>
            </div>
            {requirement.rule.requiredDocuments ? (
              <div>
                <dt className="font-medium text-foreground/70">Required documents</dt>
                <dd className="mt-1 whitespace-pre-wrap">{requirement.rule.requiredDocuments}</dd>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="font-medium text-foreground/70">Responsible module</dt>
                <dd className="mt-1">
                  <Link href={requirement.rule.responsibleModule.adminPath} className="text-brand hover:underline">
                    {requirement.rule.responsibleModule.label}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground/70">Responsible role</dt>
                <dd className="mt-1">{requirement.rule.responsibleRole}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground/70">Public route</dt>
                <dd className="mt-1">
                  {requirement.rule.publicRoute ? (
                    <Link href={requirement.rule.publicRoute.path} className="text-brand hover:underline">
                      {requirement.rule.publicRoute.label}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground/70">Owner</dt>
                <dd className="mt-1">{requirement.ownerName ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground/70">Last updated</dt>
                <dd className="mt-1">{requirement.updatedAt.toLocaleString()}</dd>
              </div>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">
                Completeness (automatic, from current database content)
              </dt>
              <dd className="mt-2">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full bg-brand"
                      style={{ width: `${requirement.completeness.percent}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{requirement.completeness.percent}%</span>
                </div>
                <ul className="flex flex-col gap-1 text-xs">
                  {requirement.completeness.checks.map((check) => (
                    <li key={check.label} className={check.met ? "text-success-foreground" : "text-foreground/60"}>
                      {check.met ? "✓" : "✗"} {check.label}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Actions</h2>
          <ComplianceActions
            requirementId={requirement.id}
            status={requirement.status}
            canView={canView}
            canVerify={canVerify}
            transition={transitionRequirement}
            workflowError={workflowError}
          />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Evidence ({requirement.evidence.length})</h2>
          <ul className="mb-4 flex flex-col gap-2 text-sm">
            {requirement.evidence.length === 0 ? (
              <li className="text-foreground/60">No evidence attached yet.</li>
            ) : (
              requirement.evidence.map((item) => (
                <li key={item.id} className="rounded-md border border-border-subtle p-3">
                  <div className="font-medium">
                    {item.entityType} — {item.entityId}
                  </div>
                  {item.note ? <div className="mt-1 text-foreground/70">{item.note}</div> : null}
                  <div className="mt-1 text-xs text-foreground/50">
                    Added by {item.addedByName} on {item.createdAt.toLocaleDateString()}
                  </div>
                </li>
              ))
            )}
          </ul>
          {canView ? <EvidenceForm requirementId={requirement.id} /> : null}
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Verification history</h2>
          {requirement.verificationHistory.length === 0 ? (
            <p className="text-sm text-foreground/60">No verification decisions have been recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {requirement.verificationHistory.map((entry) => (
                <li key={entry.id} className="rounded-md border border-border-subtle p-3">
                  <div className="font-medium">
                    {DECISION_LABELS[entry.decision] ?? entry.decision} by {entry.verifiedByName}
                  </div>
                  <div className="text-xs text-foreground/50">{entry.verifiedAt.toLocaleString()}</div>
                  {entry.note ? <div className="mt-1 text-foreground/70">{entry.note}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Link href="/admin/compliance" className="text-sm text-brand hover:underline">
          ← Back to compliance
        </Link>
      </div>
    </Container>
  );
}
