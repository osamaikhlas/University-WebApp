import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { PolicyForm } from "@/app/admin/policies/PolicyForm";

export const metadata: Metadata = { title: "Edit policy" };

export default async function EditPolicyPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(MODULE_PERMISSIONS.policies.manage);
  const { id } = await params;

  const policy = await prisma.policy.findUnique({ where: { id } });
  if (!policy) notFound();

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${policy.title}`} description="Policy" />
        <Card>
          <PolicyForm mode="edit" policy={policy} />
        </Card>
      </div>
    </Container>
  );
}
