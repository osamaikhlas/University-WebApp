import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { TimetableForm } from "@/app/admin/timetables/TimetableForm";

export const metadata: Metadata = { title: "New timetable" };

export default async function NewTimetablePage() {
  await requirePermission(MODULE_PERMISSIONS.timetables.manage);

  const college = await getPrimaryCollege();
  const programs = college
    ? await prisma.program.findMany({
        where: { collegeId: college.id, status: { not: "ARCHIVED" } },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New timetable" description="It starts as a draft." />
        {programs.length === 0 ? (
          <Alert tone="warning">
            No programs exist yet. Create a program first before adding a timetable for it.
          </Alert>
        ) : (
          <Card>
            <TimetableForm mode="create" programs={programs} />
          </Card>
        )}
      </div>
    </Container>
  );
}
