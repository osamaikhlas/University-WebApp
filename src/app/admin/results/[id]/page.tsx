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
import { transitionResult } from "@/app/admin/results/actions";

export const metadata: Metadata = { title: "Result" };

export default async function ResultViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workflowError?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.results.view);
  const { id } = await params;
  const { workflowError } = await searchParams;

  const result = await prisma.result.findUnique({
    where: { id },
    include: { program: true, examination: true },
  });
  if (!result) notFound();

  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.results.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.results.publish);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={result.examination.examType} description="Result" />
          <div className="flex items-center gap-2">
            <StatusBadge status={result.status} />
            {canManage ? (
              <LinkButton href={`/admin/results/${result.id}/edit`} variant="secondary">
                Edit
              </LinkButton>
            ) : null}
          </div>
        </div>

        {result.isPlaceholder ? <DemoDataNotice /> : null}

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-foreground/70">Program</dt>
              <dd className="mt-1">{result.program.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">External link</dt>
              <dd className="mt-1">
                {result.externalLink ? (
                  <a href={result.externalLink} className="text-brand hover:underline">
                    {result.externalLink}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="font-medium text-foreground/70">Publish date</dt>
                <dd className="mt-1">{result.publishDate?.toLocaleDateString() ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground/70">Publicly visible</dt>
                <dd className="mt-1">{result.isPublic ? "Yes" : "No"}</dd>
              </div>
            </div>
          </dl>
        </Card>

        <WorkflowActions
          entityId={result.id}
          status={result.status}
          canManage={canManage}
          canPublish={canPublish}
          transition={transitionResult}
          workflowError={workflowError}
        />

        <Link href="/admin/results" className="text-sm text-brand hover:underline">
          ← Back to results
        </Link>
      </div>
    </Container>
  );
}
