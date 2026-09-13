import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Admissions",
};

export default function Page() {
  return <PagePlaceholder title="Admissions" description="Manage admission cycles, eligibility, fees and schedules." />;
}
