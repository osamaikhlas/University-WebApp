import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { TimetableForm } from "@/app/admin/timetables/TimetableForm";

export const metadata: Metadata = { title: "Edit timetable" };

export default async function EditTimetablePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(MODULE_PERMISSIONS.timetables.manage);
  const { id } = await params;

  const timetable = await prisma.timetable.findUnique({ where: { id } });
  if (!timetable) notFound();

  const programs = await prisma.program.findMany({
    where: { collegeId: timetable.collegeId },
    orderBy: { name: "asc" },
  });

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${timetable.classGroup}`} description="Timetable" />
        <Card>
          <TimetableForm mode="edit" timetable={timetable} programs={programs} />
        </Card>
      </div>
    </Container>
  );
}
