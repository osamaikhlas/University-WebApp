import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { FeeStructureForm } from "@/app/admin/fee-structures/FeeStructureForm";

export const metadata: Metadata = { title: "Edit fee structure" };

export default async function EditFeeStructurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(MODULE_PERMISSIONS.feeStructures.manage);
  const { id } = await params;

  const feeStructure = await prisma.feeStructure.findUnique({ where: { id } });
  if (!feeStructure) notFound();

  const [programs, admissions] = await Promise.all([
    prisma.program.findMany({
      where: { collegeId: feeStructure.collegeId },
      orderBy: { name: "asc" },
    }),
    prisma.admission.findMany({
      where: { collegeId: feeStructure.collegeId },
      orderBy: { academicYear: "desc" },
    }),
  ]);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${feeStructure.feeType}`} description="Fee structure" />
        <Card>
          <FeeStructureForm
            mode="edit"
            feeStructure={{ ...feeStructure, amount: feeStructure.amount.toString() }}
            programs={programs}
            admissions={admissions}
          />
        </Card>
      </div>
    </Container>
  );
}
