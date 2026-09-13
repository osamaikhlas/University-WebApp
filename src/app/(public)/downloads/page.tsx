import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Downloads",
};

export default function Page() {
  return (
    <PagePlaceholder
      title="Downloads"
      description="Downloadable documents (notices, forms, fee structures, rules, etc.)."
      circularReference="Cross-cutting (supports items 8, 10, 18, 20)"
    />
  );
}
