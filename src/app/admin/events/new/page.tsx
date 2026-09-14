import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { EventForm } from "@/app/admin/events/EventForm";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage() {
  await requirePermission(MODULE_PERMISSIONS.events.manage);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading title="New event" description="It starts as a draft." />
        <Card>
          <EventForm mode="create" />
        </Card>
      </div>
    </Container>
  );
}
