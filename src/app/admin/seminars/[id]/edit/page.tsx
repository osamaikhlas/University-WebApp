import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { SeminarForm } from "@/app/admin/seminars/SeminarForm";

export const metadata: Metadata = { title: "Edit seminar" };

export default async function EditSeminarPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(MODULE_PERMISSIONS.seminars.manage);
  const { id } = await params;

  const seminar = await prisma.seminar.findUnique({ where: { id } });
  if (!seminar) notFound();

  const departments = await prisma.department.findMany({
    where: { collegeId: seminar.collegeId },
    orderBy: { name: "asc" },
  });

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${seminar.title}`} description="Seminar" />
        <Card>
          <SeminarForm mode="edit" seminar={seminar} departments={departments} />
        </Card>
      </div>
    </Container>
  );
}
