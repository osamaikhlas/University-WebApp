import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { InfrastructureForm } from "@/app/admin/infrastructure/InfrastructureForm";

export const metadata: Metadata = { title: "New infrastructure item" };

export default async function NewInfrastructurePage() {
  await requirePermission(MODULE_PERMISSIONS.infrastructure.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New infrastructure item" description="It starts as a draft." />
        <Card>
          <InfrastructureForm mode="create" />
        </Card>
      </div>
    </Container>
  );
}
