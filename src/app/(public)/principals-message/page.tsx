import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Principal's Message",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="Principal's Message"
      description="A message from the Principal/Head of the college."
      circularReference="Item 1"
    />
  );
}
