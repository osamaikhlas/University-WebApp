import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { ProgramForm } from "@/app/admin/programs/ProgramForm";

export const metadata: Metadata = { title: "Edit program" };

export default async function EditProgramPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(MODULE_PERMISSIONS.programs.manage);
  const { id } = await params;

  const program = await prisma.program.findUnique({ where: { id } });
  if (!program) notFound();

  const departments = await prisma.department.findMany({
    where: { collegeId: program.collegeId, status: { not: "ARCHIVED" } },
    orderBy: { name: "asc" },
  });

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${program.name}`} description="Program" />
        <Card>
          <ProgramForm mode="edit" program={program} departments={departments} />
        </Card>
      </div>
    </Container>
  );
}
