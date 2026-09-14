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
import { transitionFeeStructure } from "@/app/admin/fee-structures/actions";

export const metadata: Metadata = { title: "Fee Structure" };

export default async function FeeStructureViewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(MODULE_PERMISSIONS.feeStructures.view);
  const { id } = await params;

  const feeStructure = await prisma.feeStructure.findUnique({
    where: { id },
    include: { program: true, admission: true },
  });
  if (!feeStructure) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.feeStructures.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.feeStructures.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={feeStructure.feeType} description="Fee structure" />
          <div className="flex items-center gap-2">
            <StatusBadge status={feeStructure.status} />
            {canManage ? (
              <LinkButton href={`/admin/fee-structures/${feeStructure.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {feeStructure.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Program</dt>
              <dd className="mt-1">{feeStructure.program.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Admission cycle</dt>
              <dd className="mt-1">{feeStructure.admission?.academicYear ?? "Not linked"}</dd>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="font-medium text-foreground/70">Academic year</dt>
                <dd className="mt-1">{feeStructure.academicYear}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground/70">Amount</dt>
                <dd className="mt-1">
                  {feeStructure.amount.toString()} {feeStructure.currency}
                </dd>
              </div>
            </div>
          </dl>
        </Card>

        <WorkflowActions
          entityId={feeStructure.id}
          status={feeStructure.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionFeeStructure}
        />

        <Link href="/admin/fee-structures" className="text-sm text-brand hover:underline">
          ← Back to fee structures
        </Link>
      </div>
    </Container>
  );
}
