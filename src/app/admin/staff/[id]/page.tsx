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
import { transitionStaff } from "@/app/admin/staff/actions";

export const metadata: Metadata = { title: "Staff record" };

export default async function StaffViewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(MODULE_PERMISSIONS.staff.view);
  const { id } = await params;

  const staff = await prisma.staff.findUnique({ where: { id } });
  if (!staff) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.staff.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.staff.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={staff.name} description="Staff record" />
          <div className="flex items-center gap-2">
            <StatusBadge status={staff.status} />
            {canManage ? (
              <LinkButton href={`/admin/staff/${staff.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {staff.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Designation</dt>
              <dd className="mt-1">{staff.designation}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Department / Office</dt>
              <dd className="mt-1">{staff.department ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <WorkflowActions
          entityId={staff.id}
          status={staff.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionStaff}
        />

        <Link href="/admin/staff" className="text-sm text-brand hover:underline">
          ← Back to staff
        </Link>
      </div>
    </Container>
  );
}
