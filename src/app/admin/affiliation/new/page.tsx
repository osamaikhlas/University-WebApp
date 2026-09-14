import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { AffiliationForm } from "@/app/admin/affiliation/AffiliationForm";

export const metadata: Metadata = { title: "New affiliation" };

export default async function NewAffiliationPage() {
  await requirePermission(MODULE_PERMISSIONS.affiliation.manage);

  const college = await getPrimaryCollege();
  const programs = college
    ? await prisma.program.findMany({
        where: { collegeId: college.id, status: { not: "ARCHIVED" } },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New affiliation" description="It starts as a draft." />
        <Card>
          <AffiliationForm mode="create" programs={programs} />
        </Card>
      </div>
    </Container>
  );
}
