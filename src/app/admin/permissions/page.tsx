import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { requirePermission } from "@/lib/auth/guard";

export const metadata: Metadata = {
  title: "Permissions",
};

export default async function Page() {
  await requirePermission("permissions:manage");
  return <PagePlaceholder title="Permissions" description="Manage permissions assigned to each role." />;
}
