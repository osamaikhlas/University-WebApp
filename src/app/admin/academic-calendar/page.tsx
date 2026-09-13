import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Academic Calendar",
};

export default function Page() {
  return <PagePlaceholder title="Academic Calendar" description="Manage the academic calendar." />;
}
