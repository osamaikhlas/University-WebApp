import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { DocumentForm } from "@/app/admin/documents/DocumentForm";

export const metadata: Metadata = { title: "Edit document" };

export default async function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(MODULE_PERMISSIONS.documents.manage);
  const { id } = await params;

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) notFound();

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${document.title}`} description="Document" />
        <Card>
          <DocumentForm mode="edit" document={document} />
        </Card>
      </div>
    </Container>
  );
}
