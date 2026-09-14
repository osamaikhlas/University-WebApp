import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { ScholarshipForm } from "@/app/admin/scholarships/ScholarshipForm";

export const metadata: Metadata = { title: "New scholarship" };

export default async function NewScholarshipPage() {
  await requirePermission(MODULE_PERMISSIONS.scholarships.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New scholarship" description="It starts as a draft." />
        <Card>
          <ScholarshipForm mode="create" />
        </Card>
      </div>
    </Container>
  );
}
