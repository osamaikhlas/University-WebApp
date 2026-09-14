import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { StaffForm } from "@/app/admin/staff/StaffForm";

export const metadata: Metadata = { title: "New staff record" };

export default async function NewStaffPage() {
  await requirePermission(MODULE_PERMISSIONS.staff.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New staff record" description="It starts as a draft." />
        <Card>
          <StaffForm mode="create" />
        </Card>
      </div>
    </Container>
  );
}
