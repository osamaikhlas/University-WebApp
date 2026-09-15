import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/guard";
import { hasPermission } from "@/lib/auth/permissions";
import { ADMIN_NAV_LINKS } from "@/lib/navigation";
import { ADMIN_ROUTE_PERMISSIONS } from "@/lib/auth/route-permissions";
import { getPrimaryCollege } from "@/lib/content";
import {
  DOCUMENT_EXPIRY_WARNING_DAYS,
  STALE_CONTENT_THRESHOLD_DAYS,
  getComplianceSummary,
  getContentSummary,
  getDocumentExpiryWarnings,
  getRecentAuditActivity,
  getRecentNotices,
  getReviewWarnings,
  getStaleContent,
  getUpcomingEventsForAdmin,
} from "@/lib/admin/dashboard";
import { REVIEWABLE_MODULE_LABELS, REVIEWABLE_MODULES } from "@/lib/admin/review-settings";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { humanizeAuditAction } from "@/lib/admin/audit-logs";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { DataTable } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ComplianceStatusBadge } from "@/components/admin/ComplianceStatusBadge";

export const metadata: Metadata = {
  title: "Dashboard",
};

// Every section reads live database state (content status, compliance, audit log) — never
// statically prerendered (CLAUDE.md: no fabricated/stale statistics).
export const dynamic = "force-dynamic";

const REVIEWABLE_MODULE_ADMIN_PATHS: Record<(typeof REVIEWABLE_MODULES)[number], string> = {
  notices: "/admin/notices",
  faculty: "/admin/faculty",
  academicCalendar: "/admin/academic-calendar",
  timetables: "/admin/timetables",
  admissions: "/admin/admissions",
};

const reviewableModuleCards = REVIEWABLE_MODULES.map((key) => ({
  key,
  adminPath: REVIEWABLE_MODULE_ADMIN_PATHS[key],
}));

export default async function AdminDashboardPage() {
  const user = await requirePermission("dashboard:view");
  const college = await getPrimaryCollege();

  const canViewCompliance = hasPermission(user.permissions, "compliance:view");
  const canViewAuditLogs = hasPermission(user.permissions, "audit_logs:view");
  const canViewNotices = hasPermission(user.permissions, "content_general:view");
  const canViewEvents = hasPermission(user.permissions, "content_general:view");
  const canViewDocuments = hasPermission(user.permissions, "content_general:view");

  const [
    contentSummary,
    staleContent,
    reviewWarnings,
    complianceSummary,
    documentWarnings,
    recentNotices,
    upcomingEvents,
    recentAudit,
  ] = college
    ? await Promise.all([
        getContentSummary(college.id, user.permissions),
        getStaleContent(college.id, user.permissions),
        getReviewWarnings(college.id, user.permissions),
        canViewCompliance ? getComplianceSummary() : Promise.resolve(null),
        canViewDocuments ? getDocumentExpiryWarnings(college.id) : Promise.resolve([]),
        canViewNotices ? getRecentNotices(college.id) : Promise.resolve([]),
        canViewEvents ? getUpcomingEventsForAdmin(college.id) : Promise.resolve([]),
        canViewAuditLogs ? getRecentAuditActivity() : Promise.resolve([]),
      ])
    : [
        { published: 0, draft: 0, pendingReview: 0 },
        [],
        {
          overdue: [],
          countsByModule: { notices: 0, faculty: 0, academicCalendar: 0, timetables: 0, admissions: 0 },
        },
        null,
        [],
        [],
        [],
        [],
      ];

  const visibleModuleLinks = ADMIN_NAV_LINKS.filter((link) => {
    if (link.href === "/admin") return false;
    const required = ADMIN_ROUTE_PERMISSIONS[link.href];
    return required ? hasPermission(user.permissions, required) : true;
  });

  return (
    <Container>
      <div className="flex flex-col gap-8 py-10">
        <PageHeading
          title="Dashboard"
          description="Every number below is a live query against the database — nothing here is hard-coded."
        />

        {!college ? (
          <Alert tone="warning" title="No college record exists yet">
            Content statistics will appear once a college record has been created.
          </Alert>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Published" value={contentSummary.published} href="/admin/cms" />
              <StatCard label="Drafts" value={contentSummary.draft} tone="neutral" />
              <StatCard
                label="Pending review"
                value={contentSummary.pendingReview}
                tone={contentSummary.pendingReview > 0 ? "warning" : "neutral"}
                href="/admin/approval-workflow"
              />
              {complianceSummary ? (
                <StatCard
                  label="Compliance"
                  value={`${complianceSummary.percent}%`}
                  description={`${complianceSummary.verifiedCount} of ${complianceSummary.totalCount} verified`}
                  tone={complianceSummary.percent === 100 ? "success" : complianceSummary.percent >= 50 ? "warning" : "danger"}
                  href="/admin/compliance"
                />
              ) : null}
              {complianceSummary ? (
                <StatCard
                  label="Requirements needing attention"
                  value={complianceSummary.needsAttention.length}
                  tone={complianceSummary.needsAttention.length > 0 ? "warning" : "success"}
                  href="/admin/compliance"
                />
              ) : null}
              {canViewDocuments ? (
                <StatCard
                  label="Document expiry warnings"
                  value={documentWarnings.length}
                  description={`within ${DOCUMENT_EXPIRY_WARNING_DAYS} days, or already expired`}
                  tone={documentWarnings.some((d) => d.isExpired) ? "danger" : documentWarnings.length > 0 ? "warning" : "success"}
                  href="/admin/documents"
                />
              ) : null}
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Content review warnings</h2>
                <Link href="/admin/content-review-settings" className="text-sm text-brand hover:underline">
                  Review period settings
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {reviewableModuleCards
                  .filter((card) => hasPermission(user.permissions, MODULE_PERMISSIONS[card.key].view))
                  .map((card) => (
                    <StatCard
                      key={card.key}
                      label={`Stale ${REVIEWABLE_MODULE_LABELS[card.key].toLowerCase()}`}
                      value={reviewWarnings.countsByModule[card.key]}
                      description="overdue for review"
                      tone={reviewWarnings.countsByModule[card.key] > 0 ? "warning" : "success"}
                      href={card.adminPath}
                    />
                  ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {canViewNotices ? (
                <Card className="min-w-0">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-base font-semibold">Recent notices</h2>
                    <Link href="/admin/notices" className="text-sm text-brand hover:underline">
                      View all
                    </Link>
                  </div>
                  {recentNotices.length === 0 ? (
                    <EmptyState title="No notices yet." />
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {recentNotices.map((notice) => (
                        <li key={notice.id} className="flex items-center justify-between gap-3 text-sm">
                          <Link
                            href={`/admin/notices/${notice.id}`}
                            className="min-w-0 flex-1 truncate hover:underline"
                          >
                            {notice.title}
                          </Link>
                          <StatusBadge status={notice.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              ) : null}

              {canViewEvents ? (
                <Card className="min-w-0">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-base font-semibold">Upcoming events</h2>
                    <Link href="/admin/events" className="text-sm text-brand hover:underline">
                      View all
                    </Link>
                  </div>
                  {upcomingEvents.length === 0 ? (
                    <EmptyState title="No upcoming events." />
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {upcomingEvents.map((event) => (
                        <li key={event.id} className="flex items-center justify-between gap-3 text-sm">
                          <Link
                            href={`/admin/events/${event.id}`}
                            className="min-w-0 flex-1 truncate hover:underline"
                          >
                            {event.title}
                          </Link>
                          <span className="flex items-center gap-2 whitespace-nowrap">
                            <span className="text-foreground/60">{event.startDate.toLocaleDateString()}</span>
                            <StatusBadge status={event.status} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              ) : null}
            </div>

            {complianceSummary ? (
              <div>
                <h2 className="mb-3 text-lg font-semibold">Compliance requirements needing attention</h2>
                <DataTable
                  caption="Compliance requirements needing attention"
                  rows={complianceSummary.needsAttention}
                  getRowKey={(row) => row.id}
                  emptyState={{ title: "Every applicable requirement is verified." }}
                  columns={[
                    {
                      key: "item",
                      header: "Item",
                      render: (row) => (
                        <Link href={row.adminPath} className="font-medium text-brand hover:underline">
                          #{row.itemNumber} {row.title}
                        </Link>
                      ),
                    },
                    { key: "status", header: "Status", render: (row) => <ComplianceStatusBadge status={row.status} /> },
                    { key: "completeness", header: "Completeness", render: (row) => `${row.completenessPercent}%`, align: "right" },
                  ]}
                />
              </div>
            ) : null}

            <div>
              <h2 className="mb-1 text-lg font-semibold">Overdue reviews</h2>
              <p className="mb-3 text-xs text-foreground/60">
                Published Notices, Faculty, Academic Calendar, Timetables, and Admissions content
                past its configurable review-due date (real last-reviewed tracking, not an
                updatedAt guess — see{" "}
                <Link href="/admin/content-review-settings" className="hover:underline">
                  review period settings
                </Link>
                ).
              </p>
              <DataTable
                caption="Overdue reviews"
                rows={reviewWarnings.overdue}
                getRowKey={(row) => `${row.moduleKey}-${row.id}`}
                emptyState={{ title: "Nothing is overdue for review." }}
                columns={[
                  {
                    key: "title",
                    header: "Title",
                    render: (row) => (
                      <Link href={`${row.adminPath}/${row.id}`} className="font-medium text-brand hover:underline">
                        {row.title}
                      </Link>
                    ),
                  },
                  { key: "module", header: "Module", render: (row) => row.module },
                  {
                    key: "lastReviewed",
                    header: "Last reviewed",
                    render: (row) => (row.lastReviewedAt ? row.lastReviewedAt.toLocaleDateString() : "Never"),
                  },
                  {
                    key: "reviewer",
                    header: "Reviewer",
                    render: (row) => row.reviewerName ?? "—",
                  },
                  {
                    key: "nextReviewDue",
                    header: "Was due",
                    render: (row) => row.nextReviewDue.toLocaleDateString(),
                    align: "right",
                  },
                ]}
              />
            </div>

            <div>
              <h2 className="mb-1 text-lg font-semibold">Other content not recently reviewed</h2>
              <p className="mb-3 text-xs text-foreground/60">
                Published content (outside Notices/Faculty/Academic Calendar/Timetables/
                Admissions, which have the real review tracking above) last updated more than{" "}
                {STALE_CONTENT_THRESHOLD_DAYS} days ago — an updatedAt heuristic, used only where
                no per-record review date exists yet.
              </p>
              <DataTable
                caption="Other content not recently reviewed"
                rows={staleContent}
                getRowKey={(row) => `${row.module}-${row.id}`}
                emptyState={{ title: "Nothing is overdue for review." }}
                columns={[
                  {
                    key: "title",
                    header: "Title",
                    render: (row) => (
                      <Link href={`${row.adminPath}/${row.id}`} className="font-medium text-brand hover:underline">
                        {row.title}
                      </Link>
                    ),
                  },
                  { key: "module", header: "Module", render: (row) => row.module },
                  {
                    key: "lastUpdated",
                    header: "Last updated",
                    render: (row) => row.lastUpdated.toLocaleDateString(),
                    align: "right",
                  },
                ]}
              />
            </div>

            {canViewDocuments ? (
              <div>
                <h2 className="mb-3 text-lg font-semibold">Document expiry warnings</h2>
                <DataTable
                  caption="Document expiry warnings"
                  rows={documentWarnings}
                  getRowKey={(row) => row.id}
                  emptyState={{ title: "No published documents are expired or expiring soon." }}
                  columns={[
                    {
                      key: "title",
                      header: "Document",
                      render: (row) => (
                        <Link href={`/admin/documents/${row.id}`} className="font-medium text-brand hover:underline">
                          {row.title}
                        </Link>
                      ),
                    },
                    {
                      key: "expiryDate",
                      header: "Expiry date",
                      render: (row) => row.expiryDate.toLocaleDateString(),
                    },
                    {
                      key: "status",
                      header: "Status",
                      render: (row) =>
                        row.isExpired ? (
                          <span className="text-danger-foreground">Expired</span>
                        ) : (
                          <span className="text-warning-foreground">Expiring soon</span>
                        ),
                    },
                  ]}
                />
              </div>
            ) : null}

            {canViewAuditLogs ? (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Recent audit activity</h2>
                  <Link href="/admin/audit-logs" className="text-sm text-brand hover:underline">
                    View all
                  </Link>
                </div>
                <DataTable
                  caption="Recent audit activity"
                  rows={recentAudit}
                  getRowKey={(row) => row.id}
                  emptyState={{ title: "No audit activity yet." }}
                  columns={[
                    { key: "action", header: "Action", render: (row) => humanizeAuditAction(row.action) },
                    { key: "entity", header: "Entity", render: (row) => row.entityType },
                    { key: "actor", header: "By", render: (row) => row.actorName },
                    {
                      key: "when",
                      header: "When",
                      render: (row) => row.createdAt.toLocaleString(),
                      align: "right",
                    },
                  ]}
                />
              </div>
            ) : null}
          </>
        )}

        <div>
          <h2 className="mb-3 text-sm font-medium text-foreground/70">Admin modules</h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {visibleModuleLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm hover:bg-surface-muted"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Container>
  );
}
