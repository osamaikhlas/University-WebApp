import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Non-teaching Staff",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="Non-teaching Staff"
      description="Non-teaching staff details, including names and designations."
      circularReference="Item 5"
    />
  );
}
