import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { ContactForm } from "@/app/admin/contact/ContactForm";

export const metadata: Metadata = { title: "New contact" };

export default async function NewContactPage() {
  await requirePermission(MODULE_PERMISSIONS.contact.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New contact" description="It starts as a draft." />
        <Card>
          <ContactForm mode="create" />
        </Card>
      </div>
    </Container>
  );
}
