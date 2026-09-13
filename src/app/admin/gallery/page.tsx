import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "Gallery",
};

export default function Page() {
  return <PagePlaceholder title="Gallery" description="Manage photo gallery albums and media." />;
}
