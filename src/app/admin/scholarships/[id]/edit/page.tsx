import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { ScholarshipForm } from "@/app/admin/scholarships/ScholarshipForm";

export const metadata: Metadata = { title: "Edit scholarship" };

export default async function EditScholarshipPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(MODULE_PERMISSIONS.scholarships.manage);
  const { id } = await params;

  const scholarship = await prisma.scholarship.findUnique({ where: { id } });
  if (!scholarship) notFound();

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${scholarship.name}`} description="Scholarship" />
        <Card>
          <ScholarshipForm mode="edit" scholarship={scholarship} />
        </Card>
      </div>
    </Container>
  );
}
