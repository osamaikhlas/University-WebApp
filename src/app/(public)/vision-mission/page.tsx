import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Vision/Mission",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="Vision/Mission"
      description="The college's vision, mission and objectives."
      circularReference="Item 1"
    />
  );
}
