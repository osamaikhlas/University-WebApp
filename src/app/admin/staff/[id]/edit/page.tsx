import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { StaffForm } from "@/app/admin/staff/StaffForm";

export const metadata: Metadata = { title: "Edit staff record" };

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(MODULE_PERMISSIONS.staff.manage);
  const { id } = await params;

  const staff = await prisma.staff.findUnique({ where: { id } });
  if (!staff) notFound();

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${staff.name}`} description="Staff record" />
        <Card>
          <StaffForm mode="edit" staff={staff} />
        </Card>
      </div>
    </Container>
  );
}
