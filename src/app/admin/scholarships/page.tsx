import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Scholarships",
};

export default function Page() {
  return <PagePlaceholder title="Scholarships" description="Manage scholarship and financial assistance listings." />;
}
