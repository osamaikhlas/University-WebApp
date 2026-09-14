import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { ResultForm } from "@/app/admin/results/ResultForm";

export const metadata: Metadata = { title: "New result" };

export default async function NewResultPage() {
  await requirePermission(MODULE_PERMISSIONS.results.manage);

  const college = await getPrimaryCollege();
  const [programs, examinations] = college
    ? await Promise.all([
        prisma.program.findMany({
          where: { collegeId: college.id, status: { not: "ARCHIVED" } },
          orderBy: { name: "asc" },
        }),
        prisma.examination.findMany({
          where: { collegeId: college.id, status: { not: "ARCHIVED" } },
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], []];

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New result" description="It starts as a draft." />
        {programs.length === 0 || examinations.length === 0 ? (
          <Alert tone="warning">
            {programs.length === 0
              ? "No programs exist yet. Create a program first before adding a result."
              : "No examinations exist yet. Create an examination first before adding a result for it."}
          </Alert>
        ) : (
          <Card>
            <ResultForm mode="create" programs={programs} examinations={examinations} />
          </Card>
        )}
      </div>
    </Container>
  );
}
