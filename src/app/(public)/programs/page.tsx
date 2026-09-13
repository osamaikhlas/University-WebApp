import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Programs",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="Programs"
      description="Programs/degrees offered by the college and their affiliation/approval status."
      circularReference="Item 6"
    />
  );
}
