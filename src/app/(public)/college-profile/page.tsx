import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "College Profile",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="College Profile"
      description="College profile and introduction, including history, vision, mission and objectives."
      circularReference="Item 1"
    />
  );
}
