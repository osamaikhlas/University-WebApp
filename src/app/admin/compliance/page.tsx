import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Compliance",
};

export default function Page() {
  return <PagePlaceholder title="Compliance" description="Track compliance against the 20 circular requirements and generate the compliance report." />;
}
