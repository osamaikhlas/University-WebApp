import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Admissions",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="Admissions"
      description="Admission notices, eligibility criteria, fee structure and admission schedule."
      circularReference="Item 8"
    />
  );
}
