import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/guard";
import { getComplianceOverview } from "@/lib/compliance";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/Table";
import { LinkButton } from "@/components/ui/Button";
import { ComplianceStatusBadge } from "@/components/admin/ComplianceStatusBadge";

export const metadata: Metadata = { title: "Compliance" };

/**
 * The Compliance Dashboard: all 20 circular requirements (docs/compliance-matrix.md),
 * traced to the admin module responsible for the underlying content, with a completeness
 * check computed live against real database content (`getComplianceOverview`) and the
 * current verification status. Verifying/rejecting a requirement, attaching evidence, and
 * the full verification history all live on each requirement's detail page
 * (`/admin/compliance/[id]`) — this list is the scannable overview (CLAUDE.md rule 7: only a
 * human reviewer can move an item to Verified, never this page rendering).
 */
export default async function CompliancePage() {
  await requirePermission("compliance:view");
  const requirements = await getComplianceOverview();

  const readyCount = requirements.filter((r) => r.status === "VERIFIED").length;

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading
            title="Compliance"
            description="Track compliance against the 20 circular requirements and generate the compliance report."
          />
          <LinkButton href="/admin/compliance/reports" variant="secondary">
            Compliance reports
          </LinkButton>
        </div>

        <Card>
          <p className="text-sm text-foreground/70">
            <span className="font-semibold text-foreground">{readyCount}</span> of{" "}
            <span className="font-semibold text-foreground">{requirements.length}</span>{" "}
            requirements verified.
          </p>
        </Card>

        <DataTable
          caption="Compliance requirements"
          rows={requirements}
          getRowKey={(row) => row.id}
          emptyState={{ title: "No compliance requirements found." }}
          columns={[
            {
              key: "number",
              header: "#",
              render: (row) => row.itemNumber,
            },
            {
              key: "title",
              header: "Requirement",
              render: (row) => (
                <div className="flex flex-col gap-0.5">
                  <Link
                    href={`/admin/compliance/${row.id}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {row.title}
                  </Link>
                  <span className="text-xs text-foreground/60">{row.description}</span>
                </div>
              ),
            },
            {
              key: "module",
              header: "Responsible module",
              render: (row) => (
                <Link href={row.rule.responsibleModule.adminPath} className="hover:underline">
                  {row.rule.responsibleModule.label}
                </Link>
              ),
            },
            {
              key: "role",
              header: "Responsible role",
              render: (row) => row.rule.responsibleRole,
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <ComplianceStatusBadge status={row.status} />,
            },
            {
              key: "completeness",
              header: "Completeness",
              render: (row) => (
                <span
                  title={row.completeness.checks
                    .map((c) => `${c.met ? "✓" : "✗"} ${c.label}`)
                    .join("\n")}
                >
                  {row.completeness.percent}%
                </span>
              ),
            },
            {
              key: "publicPage",
              header: "Public route",
              render: (row) =>
                row.rule.publicRoute ? (
                  <Link href={row.rule.publicRoute.path} className="hover:underline">
                    {row.rule.publicRoute.label}
                  </Link>
                ) : (
                  "—"
                ),
            },
            {
              key: "evidence",
              header: "Evidence",
              render: (row) => row.evidenceCount,
            },
            {
              key: "lastVerified",
              header: "Last verified",
              render: (row) =>
                row.lastVerification ? row.lastVerification.verifiedAt.toLocaleDateString() : "—",
            },
            {
              key: "verifier",
              header: "Verifier",
              render: (row) => row.lastVerification?.verifiedByName ?? "—",
            },
            {
              key: "updated",
              header: "Last updated",
              render: (row) => row.updatedAt.toLocaleDateString(),
            },
          ]}
        />
      </div>
    </Container>
  );
}
