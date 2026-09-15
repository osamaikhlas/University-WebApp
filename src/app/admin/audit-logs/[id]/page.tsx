import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { getAuditLogEntry, humanizeAuditAction } from "@/lib/admin/audit-logs";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

export const metadata: Metadata = { title: "Audit log entry" };
export const dynamic = "force-dynamic";

function JsonBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-foreground/60">—</span>;
  return (
    <pre
      tabIndex={0}
      className="overflow-x-auto rounded-md bg-surface-muted p-3 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default async function AuditLogEntryPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("audit_logs:view");
  const { id } = await params;

  const entry = await getAuditLogEntry(id);
  if (!entry) notFound();

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={humanizeAuditAction(entry.action)} description="Audit log entry" />

        <Alert tone="info">
          This record is permanent — the database itself rejects any attempt to edit or delete
          it, regardless of who&rsquo;s asking. There is no &ldquo;edit&rdquo; action here
          because none exists.
        </Alert>

        <Card>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="grid gap-x-4 sm:grid-flow-col sm:grid-rows-2 sm:grid-cols-2">
              <dt className="font-medium text-foreground/70">Actor</dt>
              <dd className="mt-1">
                {entry.actorName}
                {entry.actorEmail ? ` (${entry.actorEmail})` : ""}
              </dd>
              <dt className="font-medium text-foreground/70">When</dt>
              <dd className="mt-1">{entry.createdAt.toLocaleString()}</dd>
            </div>
            <div className="grid gap-x-4 sm:grid-flow-col sm:grid-rows-2 sm:grid-cols-2">
              <dt className="font-medium text-foreground/70">Entity</dt>
              <dd className="mt-1">
                {entry.entityType} ({entry.entityId})
              </dd>
              <dt className="font-medium text-foreground/70">IP address</dt>
              <dd className="mt-1">{entry.ipAddress ?? "—"}</dd>
            </div>
            {entry.comment ? (
              <div>
                <dt className="font-medium text-foreground/70">Comment</dt>
                <dd className="mt-1 whitespace-pre-wrap">{entry.comment}</dd>
              </div>
            ) : null}
            <div className="grid gap-x-4 sm:grid-flow-col sm:grid-rows-2 sm:grid-cols-2">
              <dt className="font-medium text-foreground/70">Before</dt>
              <dd className="mt-1">
                <JsonBlock value={entry.beforeSnapshot} />
              </dd>
              <dt className="font-medium text-foreground/70">After</dt>
              <dd className="mt-1">
                <JsonBlock value={entry.afterSnapshot} />
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Metadata</dt>
              <dd className="mt-1">
                <JsonBlock value={entry.metadata} />
              </dd>
            </div>
          </dl>
        </Card>

        <Link href="/admin/audit-logs" className="text-sm text-brand hover:underline">
          ← Back to audit logs
        </Link>
      </div>
    </Container>
  );
}
