import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Student Support",
};

export default function Page() {
  return <PagePlaceholder title="Student Support" description="Manage student support service listings." />;
}
