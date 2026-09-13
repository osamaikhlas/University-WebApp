import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Gallery",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="Gallery"
      description="Photographs of academic, administrative, co-curricular and extra-curricular activities."
      circularReference="Item 16"
    />
  );
}
