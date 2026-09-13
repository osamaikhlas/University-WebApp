import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = {
  title: "CMS",
};

export default function Page() {
  return <PagePlaceholder title="CMS" description="Central content management for all public-site content types." />;
}
