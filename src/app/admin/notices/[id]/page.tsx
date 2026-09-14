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
import { transitionNotice } from "@/app/admin/notices/actions";

export const metadata: Metadata = { title: "Notice" };

export default async function NoticeViewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(MODULE_PERMISSIONS.notices.view);
  const { id } = await params;

  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.notices.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.notices.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={notice.title} description="Notice" />
          <div className="flex items-center gap-2">
            <StatusBadge status={notice.status} />
            {canManage ? (
              <LinkButton href={`/admin/notices/${notice.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {notice.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Body</dt>
              <dd className="mt-1 whitespace-pre-wrap">{notice.body}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Category</dt>
              <dd className="mt-1">{notice.category ?? "—"}</dd>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="font-medium text-foreground/70">Publish date</dt>
                <dd className="mt-1">{notice.publishDate?.toLocaleDateString() ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground/70">Expiry date</dt>
                <dd className="mt-1">{notice.expiryDate?.toLocaleDateString() ?? "—"}</dd>
              </div>
            </div>
          </dl>
        </Card>

        <WorkflowActions
          entityId={notice.id}
          status={notice.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionNotice}
        />

        <Link href="/admin/notices" className="text-sm text-brand hover:underline">
          ← Back to notices
        </Link>
      </div>
    </Container>
  );
}
