import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Events",
};

export default function Page() {
  return <PagePlaceholder title="Events" description="Author and publish college events." />;
}
