import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Contact",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="Contact"
      description="Contact details of the college, including phone numbers and official email."
      circularReference="Item 11"
    />
  );
}
