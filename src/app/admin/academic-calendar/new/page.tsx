import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { AcademicCalendarForm } from "@/app/admin/academic-calendar/AcademicCalendarForm";

export const metadata: Metadata = { title: "New calendar entry" };

export default async function NewAcademicCalendarEntryPage() {
  await requirePermission(MODULE_PERMISSIONS.academicCalendar.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New calendar entry" description="It starts as a draft." />
        <Card>
          <AcademicCalendarForm mode="create" />
        </Card>
      </div>
    </Container>
  );
}
