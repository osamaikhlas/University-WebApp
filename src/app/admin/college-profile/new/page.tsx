import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { CollegeProfileForm } from "@/app/admin/college-profile/CollegeProfileForm";

export const metadata: Metadata = { title: "Create college profile" };

export default async function NewCollegeProfilePage() {
  await requirePermission(MODULE_PERMISSIONS.collegeProfile.manage);

  const college = await getPrimaryCollege();
  const existing = college
    ? await prisma.collegeProfile.findUnique({ where: { collegeId: college.id } })
    : null;
  if (existing) {
    redirect("/admin/college-profile");
  }

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="Create college profile" description="It starts as a draft." />
        <Card>
          <CollegeProfileForm mode="create" />
        </Card>
      </div>
    </Container>
  );
}
