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

export const metadata: Metadata = { title: "Edit college profile" };

export default async function EditCollegeProfilePage() {
  await requirePermission(MODULE_PERMISSIONS.collegeProfile.manage);

  const college = await getPrimaryCollege();
  const profile = college
    ? await prisma.collegeProfile.findUnique({ where: { collegeId: college.id } })
    : null;
  if (!profile) {
    redirect("/admin/college-profile/new");
  }

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="Edit college profile" description="College Profile" />
        <Card>
          <CollegeProfileForm mode="edit" profile={profile} />
        </Card>
      </div>
    </Container>
  );
}
