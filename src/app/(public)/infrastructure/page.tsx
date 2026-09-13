import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Infrastructure",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="Infrastructure"
      description="Physical infrastructure details, including classrooms, laboratories, libraries and other facilities."
      circularReference="Item 3"
    />
  );
}
