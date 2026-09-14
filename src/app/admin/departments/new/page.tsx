import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { DepartmentForm } from "@/app/admin/departments/DepartmentForm";

export const metadata: Metadata = { title: "New department" };

export default async function NewDepartmentPage() {
  await requirePermission(MODULE_PERMISSIONS.departments.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New department" description="Create a new department. It starts as a draft." />
        <Card>
          <DepartmentForm mode="create" />
        </Card>
      </div>
    </Container>
  );
}
