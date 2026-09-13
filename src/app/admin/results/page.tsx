import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Results",
};

export default function Page() {
  return <PagePlaceholder title="Results" description="Manage examination results." />;
}
