import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { requirePermission } from "@/lib/auth/guard";

export const metadata: Metadata = {
  title: "CMS",
};

export default async function Page() {
  await requirePermission("content_general:view");
  return <PagePlaceholder title="CMS" description="Central content management for all public-site content types." />;
}
