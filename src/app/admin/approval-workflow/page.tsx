import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/guard";
import { getApprovalQueue } from "@/lib/admin/approval-queue";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { DataTable } from "@/components/ui/Table";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata: Metadata = { title: "Approval workflow" };

export default async function ApprovalWorkflowPage() {
  const user = await requirePermission("approval_workflow:view");
  const queue = await getApprovalQueue(user.permissions);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading
          title="Approval workflow"
          description="Everything waiting on a review, approval, or publish action across every content module you can publish — newest first."
        />

        <DataTable
          caption="Pending review"
          rows={queue}
          getRowKey={(row) => `${row.moduleLabel}-${row.id}`}
          emptyState={{
            title: "Nothing is waiting on you right now.",
            description: "Submitted, under-review, and approved-but-unpublished items across every module you can publish will show up here.",
          }}
          columns={[
            {
              key: "title",
              header: "Item",
              render: (row) => (
                <Link href={row.href} className="font-medium text-brand hover:underline">
                  {row.title}
                </Link>
              ),
            },
            { key: "module", header: "Module", render: (row) => row.moduleLabel },
            {
              key: "status",
              header: "Status",
              render: (row) => <StatusBadge status={row.status} />,
            },
            {
              key: "updated",
              header: "Last updated",
              render: (row) => row.updatedAt.toLocaleDateString(),
            },
          ]}
        />
      </div>
    </Container>
  );
}
