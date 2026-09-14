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
import { transitionStudentSupport } from "@/app/admin/student-support/actions";

export const metadata: Metadata = { title: "Student Support" };

export default async function StudentSupportViewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(MODULE_PERMISSIONS.studentSupport.view);
  const { id } = await params;

  const studentSupport = await prisma.studentSupport.findUnique({ where: { id } });
  if (!studentSupport) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.studentSupport.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.studentSupport.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={studentSupport.name} description="Student support service" />
          <div className="flex items-center gap-2">
            <StatusBadge status={studentSupport.status} />
            {canManage ? (
              <LinkButton href={`/admin/student-support/${studentSupport.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {studentSupport.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap">{studentSupport.description ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Contact info</dt>
              <dd className="mt-1">{studentSupport.contactInfo ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <WorkflowActions
          entityId={studentSupport.id}
          status={studentSupport.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionStudentSupport}
        />

        <Link href="/admin/student-support" className="text-sm text-brand hover:underline">
          ← Back to student support
        </Link>
      </div>
    </Container>
  );
}
