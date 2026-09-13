import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Audit logs",
};

export default function Page() {
  return <PagePlaceholder title="Audit logs" description="Read-only history of all content and account changes." />;
}
