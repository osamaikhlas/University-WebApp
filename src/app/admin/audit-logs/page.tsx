import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/guard";
import {
  AUDIT_ACTIONS,
  getAuditLogPage,
  humanizeAuditAction,
  isAuditAction,
} from "@/lib/admin/audit-logs";
import { parsePage } from "@/lib/pagination";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { DataTable } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";

export const metadata: Metadata = { title: "Audit logs" };

// Always live — a cached/stale audit log would defeat its entire purpose.
export const dynamic = "force-dynamic";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; action?: string; actor?: string; page?: string }>;
}) {
  await requirePermission("audit_logs:view");
  const params = await searchParams;

  const entityType = params.entityType?.trim() || undefined;
  const action = params.action && isAuditAction(params.action) ? params.action : undefined;
  const actorQuery = params.actor?.trim() || undefined;
  const page = parsePage(params.page);

  const { rows, totalCount, totalPages } = await getAuditLogPage({ entityType, action, actorQuery, page });

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading
          title="Audit logs"
          description="Read-only history of every recorded action across the admin system. Audit records can never be edited or deleted here — see the note below."
        />

        {/* Plain GET form: filters are shareable/bookmarkable URLs, and this never needs
            client JS. A new filter submission always resets to page 1 (no `page` field). */}
        <form method="GET" action="/admin/audit-logs" className="flex flex-wrap items-end gap-3 rounded-lg border border-border-subtle bg-surface p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="entityType" className="text-sm font-medium">
              Entity type
            </label>
            <input
              id="entityType"
              name="entityType"
              type="text"
              defaultValue={entityType ?? ""}
              placeholder="e.g. Department, Grievance"
              className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="action" className="text-sm font-medium">
              Action
            </label>
            <select
              id="action"
              name="action"
              defaultValue={action ?? ""}
              className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm"
            >
              <option value="">All actions</option>
              {AUDIT_ACTIONS.map((value) => (
                <option key={value} value={value}>
                  {humanizeAuditAction(value)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="actor" className="text-sm font-medium">
              Actor
            </label>
            <input
              id="actor"
              name="actor"
              type="text"
              defaultValue={actorQuery ?? ""}
              placeholder="Name or email"
              className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
          >
            Filter
          </button>
          {entityType || action || actorQuery ? (
            <Link href="/admin/audit-logs" className="text-sm text-brand hover:underline">
              Clear filters
            </Link>
          ) : null}
        </form>

        <p className="text-sm text-foreground/60">
          {totalCount} entr{totalCount === 1 ? "y" : "ies"}.
        </p>

        <DataTable
          caption="Audit log"
          rows={rows}
          getRowKey={(row) => row.id}
          emptyState={{ title: "No audit log entries match these filters." }}
          columns={[
            {
              key: "action",
              header: "Action",
              render: (row) => (
                <Link href={`/admin/audit-logs/${row.id}`} className="font-medium text-brand hover:underline">
                  {humanizeAuditAction(row.action)}
                </Link>
              ),
            },
            { key: "entity", header: "Entity", render: (row) => `${row.entityType} (${row.entityId})` },
            { key: "actor", header: "By", render: (row) => row.actorName },
            { key: "when", header: "When", render: (row) => row.createdAt.toLocaleString(), align: "right" },
          ]}
        />

        <Pagination
          basePath="/admin/audit-logs"
          searchParams={{ entityType: params.entityType, action: params.action, actor: params.actor }}
          page={page}
          totalPages={totalPages}
        />
      </div>
    </Container>
  );
}
