import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Timetable",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="Timetable"
      description="Class-wise/program-wise timetable."
      circularReference="Item 7"
    />
  );
}
