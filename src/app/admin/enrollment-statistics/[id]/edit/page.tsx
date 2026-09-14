import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { EnrollmentStatisticForm } from "@/app/admin/enrollment-statistics/EnrollmentStatisticForm";

export const metadata: Metadata = { title: "Edit enrollment statistic" };

export default async function EditEnrollmentStatisticPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(MODULE_PERMISSIONS.enrollmentStatistics.manage);
  const { id } = await params;

  const enrollmentStatistic = await prisma.enrollmentStatistic.findUnique({ where: { id } });
  if (!enrollmentStatistic) notFound();

  const programs = await prisma.program.findMany({
    where: { collegeId: enrollmentStatistic.collegeId, status: { not: "ARCHIVED" } },
    orderBy: { name: "asc" },
  });

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading
          title={`Edit ${enrollmentStatistic.academicYear}`}
          description="Enrollment statistic"
        />
        <Card>
          <EnrollmentStatisticForm mode="edit" enrollmentStatistic={enrollmentStatistic} programs={programs} />
        </Card>
      </div>
    </Container>
  );
}
