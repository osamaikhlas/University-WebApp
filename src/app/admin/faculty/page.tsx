import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Faculty",
};

export default function Page() {
  return <PagePlaceholder title="Faculty" description="Manage faculty records." />;
}
