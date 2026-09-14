import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { WorkshopForm } from "@/app/admin/workshops/WorkshopForm";

export const metadata: Metadata = { title: "New workshop" };

export default async function NewWorkshopPage() {
  await requirePermission(MODULE_PERMISSIONS.workshops.manage);

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
        <PageHeading title="New workshop" description="It starts as a draft." />
        <Card>
          <WorkshopForm mode="create" departments={departments} />
        </Card>
      </div>
    </Container>
  );
}
