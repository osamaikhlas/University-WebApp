import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { requirePermission } from "@/lib/auth/guard";

export const metadata: Metadata = {
  title: "Grievances",
};

export default async function Page() {
  await requirePermission("grievances:view");
  return <PagePlaceholder title="Grievances" description="Review and respond to grievance submissions. Restricted, confidential." />;
}
