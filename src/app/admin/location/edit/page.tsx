import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { LocationForm } from "@/app/admin/location/LocationForm";

export const metadata: Metadata = { title: "Edit location" };

export default async function EditLocationPage() {
  await requirePermission(MODULE_PERMISSIONS.location.manage);

  const college = await getPrimaryCollege();
  const location = college ? await prisma.location.findFirst({ where: { collegeId: college.id } }) : null;
  if (!location) {
    redirect("/admin/location/new");
  }

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="Edit location" description="Location" />
        <Card>
          <LocationForm mode="edit" location={location} />
        </Card>
      </div>
    </Container>
  );
}
