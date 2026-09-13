import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Scholarships",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="Scholarships"
      description="Scholarships and financial assistance available to students."
      circularReference="Item 17"
    />
  );
}
