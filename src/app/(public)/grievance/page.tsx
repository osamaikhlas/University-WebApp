import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Grievance",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="Grievance"
      description="Official contact/grievance mechanism for students and other stakeholders."
      circularReference="Item 19"
    />
  );
}
