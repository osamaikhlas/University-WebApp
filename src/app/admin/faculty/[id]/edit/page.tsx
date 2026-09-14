import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { FacultyForm } from "@/app/admin/faculty/FacultyForm";

export const metadata: Metadata = { title: "Edit faculty record" };

export default async function EditFacultyPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(MODULE_PERMISSIONS.faculty.manage);
  const { id } = await params;

  const faculty = await prisma.faculty.findUnique({ where: { id } });
  if (!faculty) notFound();

  const departments = await prisma.department.findMany({
    where: { collegeId: faculty.collegeId },
    orderBy: { name: "asc" },
  });

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${faculty.name}`} description="Faculty record" />
        <Card>
          <FacultyForm mode="edit" faculty={faculty} departments={departments} />
        </Card>
      </div>
    </Container>
  );
}
