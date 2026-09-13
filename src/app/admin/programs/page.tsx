import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Programs",
};

export default function Page() {
  return <PagePlaceholder title="Programs" description="Manage programs/degrees offered and their affiliation status." />;
}
