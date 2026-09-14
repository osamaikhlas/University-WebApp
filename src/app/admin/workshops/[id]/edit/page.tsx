import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { WorkshopForm } from "@/app/admin/workshops/WorkshopForm";

export const metadata: Metadata = { title: "Edit workshop" };

export default async function EditWorkshopPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(MODULE_PERMISSIONS.workshops.manage);
  const { id } = await params;

  const workshop = await prisma.workshop.findUnique({ where: { id } });
  if (!workshop) notFound();

  const departments = await prisma.department.findMany({
    where: { collegeId: workshop.collegeId, status: { not: "ARCHIVED" } },
    orderBy: { name: "asc" },
  });

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${workshop.title}`} description="Workshop" />
        <Card>
          <WorkshopForm mode="edit" workshop={workshop} departments={departments} />
        </Card>
      </div>
    </Container>
  );
}
