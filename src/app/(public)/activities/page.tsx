import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Activities",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="Activities"
      description="Co-curricular and extra-curricular activities, including sports, debates and societies."
      circularReference="Item 14"
    />
  );
}
