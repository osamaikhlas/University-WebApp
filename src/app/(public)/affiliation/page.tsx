import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Affiliation",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="Affiliation"
      description="Affiliation with Shah Abdul Latif University and relevant regulatory approvals."
      circularReference="Item 13"
    />
  );
}
