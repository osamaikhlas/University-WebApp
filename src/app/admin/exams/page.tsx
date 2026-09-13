import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Exams",
};

export default function Page() {
  return <PagePlaceholder title="Exams" description="Manage examination schedules and notices." />;
}
