import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { ExaminationForm } from "@/app/admin/exams/ExaminationForm";

export const metadata: Metadata = { title: "Edit examination" };

export default async function EditExaminationPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(MODULE_PERMISSIONS.examinations.manage);
  const { id } = await params;

  const examination = await prisma.examination.findUnique({ where: { id } });
  if (!examination) notFound();

  const [programs, notices] = await Promise.all([
    prisma.program.findMany({
      where: { collegeId: examination.collegeId, status: { not: "ARCHIVED" } },
      orderBy: { name: "asc" },
    }),
    prisma.notice.findMany({
      where: { collegeId: examination.collegeId, status: { not: "ARCHIVED" } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${examination.examType}`} description="Examination" />
        <Card>
          <ExaminationForm mode="edit" examination={examination} programs={programs} notices={notices} />
        </Card>
      </div>
    </Container>
  );
}
