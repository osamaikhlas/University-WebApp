import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { StudentSupportForm } from "@/app/admin/student-support/StudentSupportForm";

export const metadata: Metadata = { title: "New student support service" };

export default async function NewStudentSupportPage() {
  await requirePermission(MODULE_PERMISSIONS.studentSupport.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New student support service" description="It starts as a draft." />
        <Card>
          <StudentSupportForm mode="create" />
        </Card>
      </div>
    </Container>
  );
}
