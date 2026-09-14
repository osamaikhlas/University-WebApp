import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { FeeStructureForm } from "@/app/admin/fee-structures/FeeStructureForm";

export const metadata: Metadata = { title: "New fee structure" };

export default async function NewFeeStructurePage() {
  await requirePermission(MODULE_PERMISSIONS.feeStructures.manage);

  const college = await getPrimaryCollege();
  const [programs, admissions] = college
    ? await Promise.all([
        prisma.program.findMany({
          where: { collegeId: college.id },
          orderBy: { name: "asc" },
        }),
        prisma.admission.findMany({
          where: { collegeId: college.id },
          orderBy: { academicYear: "desc" },
        }),
      ])
    : [[], []];

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New fee structure" description="It starts as a draft." />
        {programs.length === 0 ? (
          <Alert tone="warning">
            No programs exist yet. Create a program first before adding a fee structure for it.
          </Alert>
        ) : (
          <Card>
            <FeeStructureForm mode="create" programs={programs} admissions={admissions} />
          </Card>
        )}
      </div>
    </Container>
  );
}
