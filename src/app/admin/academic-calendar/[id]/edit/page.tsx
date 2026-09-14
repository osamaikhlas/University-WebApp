import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { AcademicCalendarForm } from "@/app/admin/academic-calendar/AcademicCalendarForm";

export const metadata: Metadata = { title: "Edit calendar entry" };

export default async function EditAcademicCalendarEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(MODULE_PERMISSIONS.academicCalendar.manage);
  const { id } = await params;

  const entry = await prisma.academicCalendar.findUnique({ where: { id } });
  if (!entry) notFound();

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${entry.title}`} description="Academic calendar entry" />
        <Card>
          <AcademicCalendarForm mode="edit" entry={entry} />
        </Card>
      </div>
    </Container>
  );
}
