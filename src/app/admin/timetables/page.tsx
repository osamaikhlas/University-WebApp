import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Timetables",
};

export default function Page() {
  return <PagePlaceholder title="Timetables" description="Manage class-wise/program-wise timetables." />;
}
