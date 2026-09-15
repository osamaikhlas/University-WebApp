import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import type { GrievanceStatusValue } from "@/lib/grievance-workflow";
import { GRIEVANCE_CATEGORIES } from "@/lib/grievance-categories";
import { DEFAULT_PAGE_SIZE, getSkipTake, getTotalPages, parsePage } from "@/lib/pagination";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { DataTable } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { GrievanceStatusBadge } from "@/components/admin/GrievanceStatusBadge";
import { GrievanceFilterBar } from "@/components/admin/GrievanceFilterBar";

export const metadata: Metadata = { title: "Grievances" };

// Grievance data is never statically prerendered (CLAUDE.md rule 4's spirit applies doubly
// here — rule 6 means this must always reflect the live, access-controlled database, never a
// cached build-time snapshot).
export const dynamic = "force-dynamic";

const STATUS_VALUES: GrievanceStatusValue[] = [
  "NEW",
  "ASSIGNED",
  "UNDER_REVIEW",
  "ACTION_REQUIRED",
  "RESOLVED",
  "CLOSED",
];

export default async function GrievancesListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; q?: string; page?: string }>;
}) {
  await requirePermission("grievances:view");
  const params = await searchParams;

  const status = STATUS_VALUES.includes(params.status as GrievanceStatusValue)
    ? (params.status as GrievanceStatusValue)
    : undefined;
  const category = GRIEVANCE_CATEGORIES.includes(params.category as (typeof GRIEVANCE_CATEGORIES)[number])
    ? params.category
    : undefined;
  const q = params.q?.trim() || undefined;
  const page = parsePage(params.page);

  const college = await getPrimaryCollege();

  const where = college
    ? {
        collegeId: college.id,
        ...(status ? { status } : {}),
        ...(category ? { category } : {}),
        ...(q
          ? {
              OR: [
                { referenceNumber: { contains: q, mode: "insensitive" as const } },
                { subject: { contains: q, mode: "insensitive" as const } },
                { submitterName: { contains: q, mode: "insensitive" as const } },
                { description: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      }
    : null;

  const [grievances, totalCount] = where
    ? await Promise.all([
        prisma.grievance.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: { assignedTo: { select: { name: true } } },
          ...getSkipTake(page, DEFAULT_PAGE_SIZE),
        }),
        prisma.grievance.count({ where }),
      ])
    : [[], 0];

  const totalPages = getTotalPages(totalCount, DEFAULT_PAGE_SIZE);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading
          title="Grievances"
          description="Confidential submissions — visible only to authorized staff. Never published on the public site."
        />

        <GrievanceFilterBar
          basePath="/admin/grievances"
          q={q ?? ""}
          status={status ?? ""}
          category={category ?? ""}
        />

        <p className="text-sm text-foreground/60">
          {totalCount} grievance{totalCount === 1 ? "" : "s"} found.
        </p>

        <DataTable
          caption="Grievances"
          rows={grievances}
          getRowKey={(row) => row.id}
          emptyState={{
            title: "No grievances found.",
            description: q || status || category ? "Try adjusting your filters." : undefined,
          }}
          columns={[
            {
              key: "referenceNumber",
              header: "Reference #",
              render: (row) => (
                <Link
                  href={`/admin/grievances/${row.id}`}
                  className="font-mono text-xs font-medium text-brand hover:underline"
                >
                  {row.referenceNumber}
                </Link>
              ),
            },
            {
              key: "subject",
              header: "Subject",
              render: (row) => <span className="line-clamp-1">{row.subject}</span>,
            },
            { key: "category", header: "Category", render: (row) => row.category },
            {
              key: "status",
              header: "Status",
              render: (row) => <GrievanceStatusBadge status={row.status} />,
            },
            {
              key: "assignedTo",
              header: "Assigned to",
              render: (row) => row.assignedTo?.name ?? "—",
            },
            {
              key: "createdAt",
              header: "Submitted",
              render: (row) => row.createdAt.toLocaleDateString(),
            },
          ]}
        />

        <Pagination
          basePath="/admin/grievances"
          searchParams={{ status: params.status, category: params.category, q: params.q }}
          page={page}
          totalPages={totalPages}
        />
      </div>
    </Container>
  );
}
