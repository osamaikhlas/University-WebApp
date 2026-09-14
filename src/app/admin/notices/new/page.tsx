import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { NoticeForm } from "@/app/admin/notices/NoticeForm";

export const metadata: Metadata = { title: "New notice" };

export default async function NewNoticePage() {
  await requirePermission(MODULE_PERMISSIONS.notices.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New notice" description="It starts as a draft." />
        <Card>
          <NoticeForm mode="create" />
        </Card>
      </div>
    </Container>
  );
}
