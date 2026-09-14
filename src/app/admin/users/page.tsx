import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { requirePermission } from "@/lib/auth/guard";

export const metadata: Metadata = {
  title: "Users",
};

export default async function Page() {
  await requirePermission("users:manage");
  return <PagePlaceholder title="Users" description="Manage admin user accounts." />;
}
