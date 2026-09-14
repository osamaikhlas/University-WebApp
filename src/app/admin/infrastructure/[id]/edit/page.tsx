import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { InfrastructureForm } from "@/app/admin/infrastructure/InfrastructureForm";

export const metadata: Metadata = { title: "Edit infrastructure item" };

export default async function EditInfrastructurePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(MODULE_PERMISSIONS.infrastructure.manage);
  const { id } = await params;

  const infrastructure = await prisma.infrastructure.findUnique({ where: { id } });
  if (!infrastructure) notFound();

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${infrastructure.name}`} description="Infrastructure item" />
        <Card>
          <InfrastructureForm mode="edit" infrastructure={infrastructure} />
        </Card>
      </div>
    </Container>
  );
}
