import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { requirePermission } from "@/lib/auth/guard";

export const metadata: Metadata = {
  title: "Approval workflow",
};

export default async function Page() {
  await requirePermission("approval_workflow:view");
  return <PagePlaceholder title="Approval workflow" description="Review, approve or reject content submitted for publication." />;
}
