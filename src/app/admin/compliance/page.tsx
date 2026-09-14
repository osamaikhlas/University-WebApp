import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { requirePermission } from "@/lib/auth/guard";

export const metadata: Metadata = {
  title: "Compliance",
};

export default async function Page() {
  await requirePermission("compliance:view");
  return <PagePlaceholder title="Compliance" description="Track compliance against the 20 circular requirements and generate the compliance report." />;
}
