import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { ClubForm } from "@/app/admin/clubs/ClubForm";

export const metadata: Metadata = { title: "New club" };

export default async function NewClubPage() {
  await requirePermission(MODULE_PERMISSIONS.clubs.manage);

  const college = await getPrimaryCollege();
  const facultyMembers = college
    ? await prisma.faculty.findMany({
        where: { collegeId: college.id, status: { not: "ARCHIVED" } },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New club" description="It starts as a draft." />
        <Card>
          <ClubForm mode="create" facultyMembers={facultyMembers} />
        </Card>
      </div>
    </Container>
  );
}
