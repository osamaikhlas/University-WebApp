import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { ExaminationForm } from "@/app/admin/exams/ExaminationForm";

export const metadata: Metadata = { title: "New examination" };

export default async function NewExaminationPage() {
  await requirePermission(MODULE_PERMISSIONS.examinations.manage);

  const college = await getPrimaryCollege();
  const [programs, notices] = college
    ? await Promise.all([
        prisma.program.findMany({
          where: { collegeId: college.id },
          orderBy: { name: "asc" },
        }),
        prisma.notice.findMany({
          where: { collegeId: college.id },
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], []];

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New examination" description="It starts as a draft." />
        {programs.length === 0 ? (
          <Alert tone="warning">
            No programs exist yet. Create a program first before adding an examination for it.
          </Alert>
        ) : (
          <Card>
            <ExaminationForm mode="create" programs={programs} notices={notices} />
          </Card>
        )}
      </div>
    </Container>
  );
}
