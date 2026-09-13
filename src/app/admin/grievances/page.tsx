import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Grievances",
};

export default function Page() {
  return <PagePlaceholder title="Grievances" description="Review and respond to grievance submissions. Restricted, confidential." />;
}
