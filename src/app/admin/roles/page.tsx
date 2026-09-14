import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { requirePermission } from "@/lib/auth/guard";

export const metadata: Metadata = {
  title: "Roles",
};

export default async function Page() {
  await requirePermission("roles:manage");
  return <PagePlaceholder title="Roles" description="Manage system roles." />;
}
