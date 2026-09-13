import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Approval workflow",
};

export default function Page() {
  return <PagePlaceholder title="Approval workflow" description="Review, approve or reject content submitted for publication." />;
}
