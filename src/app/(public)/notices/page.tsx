import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Notices",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="Notices"
      description="College notifications and announcements."
      circularReference="Items 2, 15"
    />
  );
}
