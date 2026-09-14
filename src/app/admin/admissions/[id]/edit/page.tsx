import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { AdmissionForm } from "@/app/admin/admissions/AdmissionForm";

export const metadata: Metadata = { title: "Edit admission cycle" };

export default async function EditAdmissionPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(MODULE_PERMISSIONS.admissions.manage);
  const { id } = await params;

  const admission = await prisma.admission.findUnique({ where: { id } });
  if (!admission) notFound();

  const programs = await prisma.program.findMany({
    where: { collegeId: admission.collegeId, status: { not: "ARCHIVED" } },
    orderBy: { name: "asc" },
  });

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${admission.academicYear}`} description="Admission cycle" />
        <Card>
          <AdmissionForm mode="edit" admission={admission} programs={programs} />
        </Card>
      </div>
    </Container>
  );
}
