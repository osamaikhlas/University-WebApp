import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Search",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="Search"
      description="Search published content across the site."
      circularReference="Cross-cutting"
    />
  );
}
