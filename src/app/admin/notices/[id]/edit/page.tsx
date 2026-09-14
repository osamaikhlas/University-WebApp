import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { NoticeForm } from "@/app/admin/notices/NoticeForm";

export const metadata: Metadata = { title: "Edit notice" };

export default async function EditNoticePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(MODULE_PERMISSIONS.notices.manage);
  const { id } = await params;

  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice) notFound();

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title={`Edit ${notice.title}`} description="Notice" />
        <Card>
          <NoticeForm mode="edit" notice={notice} />
        </Card>
      </div>
    </Container>
  );
}
