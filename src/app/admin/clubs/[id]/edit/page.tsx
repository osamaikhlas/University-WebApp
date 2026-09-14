import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { ClubForm } from "@/app/admin/clubs/ClubForm";

export const metadata: Metadata = { title: "Edit club" };

export default async function EditClubPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(MODULE_PERMISSIONS.clubs.manage);
  const { id } = await params;

  const club = await prisma.club.findUnique({ where: { id } });
  if (!club) notFound();

  const facultyMembers = await prisma.faculty.findMany({
    where: { collegeId: club.collegeId },
    orderBy: { name: "asc" },
  });

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${club.name}`} description="Club" />
        <Card>
          <ClubForm mode="edit" club={club} facultyMembers={facultyMembers} />
        </Card>
      </div>
    </Container>
  );
}
