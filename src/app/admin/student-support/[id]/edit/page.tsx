import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { StudentSupportForm } from "@/app/admin/student-support/StudentSupportForm";

export const metadata: Metadata = { title: "Edit student support service" };

export default async function EditStudentSupportPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(MODULE_PERMISSIONS.studentSupport.manage);
  const { id } = await params;

  const studentSupport = await prisma.studentSupport.findUnique({ where: { id } });
  if (!studentSupport) notFound();

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${studentSupport.name}`} description="Student support service" />
        <Card>
          <StudentSupportForm mode="edit" studentSupport={studentSupport} />
        </Card>
      </div>
    </Container>
  );
}
