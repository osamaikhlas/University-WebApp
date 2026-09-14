import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { ProgramForm } from "@/app/admin/programs/ProgramForm";

export const metadata: Metadata = { title: "New program" };

export default async function NewProgramPage() {
  await requirePermission(MODULE_PERMISSIONS.programs.manage);

  const college = await getPrimaryCollege();
  const departments = college
    ? await prisma.department.findMany({
        where: { collegeId: college.id, status: { not: "ARCHIVED" } },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New program" description="Create a new program. It starts as a draft." />
        {departments.length === 0 ? (
          <Alert tone="warning">
            No departments exist yet. Create a department first before adding programs to it.
          </Alert>
        ) : (
          <Card>
            <ProgramForm mode="create" departments={departments} />
          </Card>
        )}
      </div>
    </Container>
  );
}
