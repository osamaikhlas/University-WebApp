import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "History",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="History"
      description="History of the college."
      circularReference="Item 1"
    />
  );
}
