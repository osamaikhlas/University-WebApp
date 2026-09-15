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
import { transitionClub } from "@/app/admin/clubs/actions";

export const metadata: Metadata = { title: "Club" };

export default async function ClubViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workflowError?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.clubs.view);
  const { id } = await params;
  const { workflowError } = await searchParams;

  const club = await prisma.club.findUnique({ where: { id }, include: { facultyAdvisor: true } });
  if (!club) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.clubs.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.clubs.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={club.name} description="Club" />
          <div className="flex items-center gap-2">
            <StatusBadge status={club.status} />
            {canManage ? (
              <LinkButton href={`/admin/clubs/${club.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {club.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Faculty advisor</dt>
              <dd className="mt-1">{club.facultyAdvisor?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap">{club.description ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <WorkflowActions
                    entityType="Club"
          entityId={club.id}
          status={club.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionClub}
          workflowError={workflowError}
        />

        <Link href="/admin/clubs" className="text-sm text-brand hover:underline">
          ← Back to clubs
        </Link>
      </div>
    </Container>
  );
}
