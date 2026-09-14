import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { hasPermission } from "@/lib/auth/permissions";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { WorkflowActions } from "@/components/admin/WorkflowActions";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { transitionAffiliation } from "@/app/admin/affiliation/actions";

export const metadata: Metadata = { title: "Affiliation" };

export default async function AffiliationViewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(MODULE_PERMISSIONS.affiliation.view);
  const { id } = await params;

  const affiliation = await prisma.affiliation.findUnique({ where: { id }, include: { program: true } });
  if (!affiliation) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.affiliation.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.affiliation.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={affiliation.universityName} description="Affiliation" />
          <div className="flex items-center gap-2">
            <StatusBadge status={affiliation.status} />
            {canManage ? (
              <LinkButton href={`/admin/affiliation/${affiliation.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {affiliation.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Program</dt>
              <dd className="mt-1">{affiliation.program?.name ?? "College-wide"}</dd>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="font-medium text-foreground/70">Affiliation number</dt>
                <dd className="mt-1">{affiliation.affiliationNumber ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground/70">Regulatory body</dt>
                <dd className="mt-1">{affiliation.regulatoryBody ?? "—"}</dd>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="font-medium text-foreground/70">Valid from</dt>
                <dd className="mt-1">{affiliation.validFrom?.toLocaleDateString() ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground/70">Valid to</dt>
                <dd className="mt-1">{affiliation.validTo?.toLocaleDateString() ?? "—"}</dd>
              </div>
            </div>
          </dl>
        </Card>

        <WorkflowActions
          entityId={affiliation.id}
          status={affiliation.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionAffiliation}
        />

        <Link href="/admin/affiliation" className="text-sm text-brand hover:underline">
          ← Back to affiliation
        </Link>
      </div>
    </Container>
  );
}
