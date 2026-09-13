import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "About",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="About"
      description="General information about the college."
      circularReference="Item 1 — College Profile and Introduction"
    />
  );
}
