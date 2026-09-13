import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Roles",
};

export default function Page() {
  return <PagePlaceholder title="Roles" description="Manage system roles." />;
}
