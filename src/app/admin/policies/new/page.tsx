import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { PolicyForm } from "@/app/admin/policies/PolicyForm";

export const metadata: Metadata = { title: "New policy" };

export default async function NewPolicyPage() {
  await requirePermission(MODULE_PERMISSIONS.policies.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New policy" description="It starts as a draft." />
        <Card>
          <PolicyForm mode="create" />
        </Card>
      </div>
    </Container>
  );
}
