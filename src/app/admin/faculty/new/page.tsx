import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { FacultyForm } from "@/app/admin/faculty/FacultyForm";

export const metadata: Metadata = { title: "New faculty record" };

export default async function NewFacultyPage() {
  await requirePermission(MODULE_PERMISSIONS.faculty.manage);

  const college = await getPrimaryCollege();
  const departments = college
    ? await prisma.department.findMany({
        where: { collegeId: college.id },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New faculty record" description="It starts as a draft." />
        {departments.length === 0 ? (
          <Alert tone="warning">
            No departments exist yet. Create a department first before adding faculty to it.
          </Alert>
        ) : (
          <Card>
            <FacultyForm mode="create" departments={departments} />
          </Card>
        )}
      </div>
    </Container>
  );
}
