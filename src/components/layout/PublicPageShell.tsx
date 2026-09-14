import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";

/**
 * The shared page container every public route is built on: breadcrumbs, a heading, and a
 * consistent max-width/padding wrapper (`Container`). Keeping this in one place is what
 * makes every public page's structure (and its responsive behavior) consistent.
 */
export function PublicPageShell({
  title,
  description,
  breadcrumbLabel,
  children,
}: {
  title: string;
  description?: string;
  /** Defaults to `title` — override when the nav label and page heading should differ. */
  breadcrumbLabel?: string;
  children: ReactNode;
}) {
  return (
    <Container>
      <div className="flex flex-col gap-6 py-8 sm:py-10">
        <Breadcrumbs items={[{ label: breadcrumbLabel ?? title }]} />
        <PageHeading title={title} description={description} />
        {children}
      </div>
    </Container>
  );
}
