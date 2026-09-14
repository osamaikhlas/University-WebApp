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
import { transitionProgram } from "@/app/admin/programs/actions";

export const metadata: Metadata = { title: "Program" };

export default async function ProgramViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workflowError?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.programs.view);
  const { id } = await params;
  const { workflowError } = await searchParams;

  const program = await prisma.program.findUnique({ where: { id }, include: { department: true } });
  if (!program) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.programs.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.programs.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={program.name} description="Program" />
          <div className="flex items-center gap-2">
            <StatusBadge status={program.status} />
            {canManage ? (
              <LinkButton href={`/admin/programs/${program.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {program.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Department</dt>
              <dd className="mt-1">{program.department.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Level</dt>
              <dd className="mt-1">{program.level.replace(/_/g, " ")}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Duration</dt>
              <dd className="mt-1">
                {program.durationYears} yr{program.durationYears === 1 ? "" : "s"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap">{program.description ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <WorkflowActions
          entityId={program.id}
          status={program.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionProgram}
          workflowError={workflowError}
        />

        <Link href="/admin/programs" className="text-sm text-brand hover:underline">
          ← Back to programs
        </Link>
      </div>
    </Container>
  );
}
