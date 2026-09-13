import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Documents",
};

export default function Page() {
  return <PagePlaceholder title="Documents" description="Manage uploaded documents (fee structures, rules, approvals, etc.)." />;
}
