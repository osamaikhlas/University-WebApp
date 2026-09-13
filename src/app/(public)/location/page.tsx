import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Location",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="Location"
      description="Complete college location, including postal address and map link."
      circularReference="Item 12"
    />
  );
}
