import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Events",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="Events"
      description="Seminars, workshops and other college events."
      circularReference="Items 2, 14"
    />
  );
}
