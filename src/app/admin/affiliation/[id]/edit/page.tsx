import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { AffiliationForm } from "@/app/admin/affiliation/AffiliationForm";

export const metadata: Metadata = { title: "Edit affiliation" };

export default async function EditAffiliationPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(MODULE_PERMISSIONS.affiliation.manage);
  const { id } = await params;

  const affiliation = await prisma.affiliation.findUnique({ where: { id } });
  if (!affiliation) notFound();

  const programs = await prisma.program.findMany({
    where: { collegeId: affiliation.collegeId },
    orderBy: { name: "asc" },
  });

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${affiliation.universityName}`} description="Affiliation" />
        <Card>
          <AffiliationForm mode="edit" affiliation={affiliation} programs={programs} />
        </Card>
      </div>
    </Container>
  );
}
