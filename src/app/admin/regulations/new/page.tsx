import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { RegulationForm } from "@/app/admin/regulations/RegulationForm";

export const metadata: Metadata = { title: "New regulation" };

export default async function NewRegulationPage() {
  await requirePermission(MODULE_PERMISSIONS.regulations.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New regulation" description="It starts as a draft." />
        <Card>
          <RegulationForm mode="create" />
        </Card>
      </div>
    </Container>
  );
}
