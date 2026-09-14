import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { ContactForm } from "@/app/admin/contact/ContactForm";

export const metadata: Metadata = { title: "Edit contact" };

export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(MODULE_PERMISSIONS.contact.manage);
  const { id } = await params;

  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) notFound();

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${contact.value}`} description="Contact" />
        <Card>
          <ContactForm mode="edit" contact={contact} />
        </Card>
      </div>
    </Container>
  );
}
