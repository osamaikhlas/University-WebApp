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
import { transitionDepartment } from "@/app/admin/departments/actions";

export const metadata: Metadata = { title: "Department" };

export default async function DepartmentViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workflowError?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.departments.view);
  const { id } = await params;
  const { workflowError } = await searchParams;

  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.departments.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.departments.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={department.name} description="Department" />
          <div className="flex items-center gap-2">
            <StatusBadge status={department.status} />
            {canManage ? (
              <LinkButton href={`/admin/departments/${department.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {department.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap">{department.description ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <WorkflowActions
          entityId={department.id}
          status={department.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionDepartment}
          workflowError={workflowError}
        />

        <Link href="/admin/departments" className="text-sm text-brand hover:underline">
          ← Back to departments
        </Link>
      </div>
    </Container>
  );
}
