import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Departments",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="Departments"
      description="Academic departments of the college."
      circularReference="Item 6 (Programs/Degrees Offered)"
    />
  );
}
