import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Rules and Regulations",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="Rules and Regulations"
      description="College rules, regulations and policies relevant to students and staff."
      circularReference="Item 18"
    />
  );
}
