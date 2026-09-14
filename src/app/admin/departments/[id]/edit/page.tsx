import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { DepartmentForm } from "@/app/admin/departments/DepartmentForm";

export const metadata: Metadata = { title: "Edit department" };

export default async function EditDepartmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(MODULE_PERMISSIONS.departments.manage);
  const { id } = await params;

  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) notFound();

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${department.name}`} description="Department" />
        <Card>
          <DepartmentForm mode="edit" department={department} />
        </Card>
      </div>
    </Container>
  );
}
