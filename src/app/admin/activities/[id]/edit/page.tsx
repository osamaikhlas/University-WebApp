import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { ActivityForm } from "@/app/admin/activities/ActivityForm";

export const metadata: Metadata = { title: "Edit activity" };

export default async function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(MODULE_PERMISSIONS.activities.manage);
  const { id } = await params;

  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) notFound();

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${activity.title}`} description="Activity" />
        <Card>
          <ActivityForm mode="edit" activity={activity} />
        </Card>
      </div>
    </Container>
  );
}
