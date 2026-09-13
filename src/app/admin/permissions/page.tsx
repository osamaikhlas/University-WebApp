import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Permissions",
};

export default function Page() {
  return <PagePlaceholder title="Permissions" description="Manage permissions assigned to each role." />;
}
