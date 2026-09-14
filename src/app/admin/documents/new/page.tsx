import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { DocumentForm } from "@/app/admin/documents/DocumentForm";

export const metadata: Metadata = { title: "New document" };

export default async function NewDocumentPage() {
  await requirePermission(MODULE_PERMISSIONS.documents.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New document" description="It starts as a draft." />
        <Card>
          <DocumentForm mode="create" />
        </Card>
      </div>
    </Container>
  );
}
