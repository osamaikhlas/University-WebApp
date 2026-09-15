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
import { transitionContact } from "@/app/admin/contact/actions";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workflowError?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.contact.view);
  const { id } = await params;
  const { workflowError } = await searchParams;

  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.contact.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.contact.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={contact.value} description="Contact" />
          <div className="flex items-center gap-2">
            <StatusBadge status={contact.status} />
            {canManage ? (
              <LinkButton href={`/admin/contact/${contact.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {contact.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Type</dt>
              <dd className="mt-1">{contact.type}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Label</dt>
              <dd className="mt-1">{contact.label ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <WorkflowActions
                    entityType="Contact"
          entityId={contact.id}
          status={contact.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionContact}
          workflowError={workflowError}
        />

        <Link href="/admin/contact" className="text-sm text-brand hover:underline">
          ← Back to contact
        </Link>
      </div>
    </Container>
  );
}
