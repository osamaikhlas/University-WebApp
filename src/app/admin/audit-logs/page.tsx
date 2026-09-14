import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { requirePermission } from "@/lib/auth/guard";

export const metadata: Metadata = {
  title: "Audit logs",
};

export default async function Page() {
  await requirePermission("audit_logs:view");
  return <PagePlaceholder title="Audit logs" description="Read-only history of all content and account changes." />;
}
