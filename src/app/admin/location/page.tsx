import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { hasPermission } from "@/lib/auth/permissions";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { WorkflowActions } from "@/components/admin/WorkflowActions";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { transitionLocation } from "@/app/admin/location/actions";

export const metadata: Metadata = { title: "Location" };

export default async function LocationPage({
  searchParams,
}: {
  searchParams: Promise<{ workflowError?: string }>;
}) {
  const user = await requirePermission(MODULE_PERMISSIONS.location.view);
  const { workflowError } = await searchParams;
  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.location.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.location.publish);

  const college = await getPrimaryCollege();
  const location = college
    ? await prisma.location.findFirst({ where: { collegeId: college.id } })
    : null;

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title="Location" description="The college's physical address and map." />
          {location ? (
            <div className="flex items-center gap-2">
              <StatusBadge status={location.status} />
              {canManage ? (
                <LinkButton href="/admin/location/edit" variant="secondary">
                  Edit
                </LinkButton>
              ) : null}
            </div>
          ) : null}
        </div>

        {!location ? (
          <EmptyState
            title="No location has been created yet."
            action={
              canManage ? (
                <LinkButton href="/admin/location/new">Create location</LinkButton>
              ) : undefined
            }
          />
        ) : (
          <>
            {location.isPlaceholder ? <DemoDataNotice /> : null}

            <Card>
              <dl className="flex flex-col gap-4 text-sm">
                <div>
                  <dt className="font-medium text-foreground/70">Address</dt>
                  <dd className="mt-1 whitespace-pre-wrap">{location.address}</dd>
                </div>
                <div className="grid gap-x-4 sm:grid-flow-col sm:grid-rows-2 sm:grid-cols-2">
                  <dt className="font-medium text-foreground/70">Latitude</dt>
                  <dd className="mt-1">{location.latitude ?? "—"}</dd>
                  <dt className="font-medium text-foreground/70">Longitude</dt>
                  <dd className="mt-1">{location.longitude ?? "—"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground/70">Map embed URL</dt>
                  <dd className="mt-1">{location.mapEmbedUrl ?? "—"}</dd>
                </div>
              </dl>
            </Card>

            <WorkflowActions
                            entityType="Location"
              entityId={location.id}
              status={location.status}
              canManage={canManage}
              canPublish={canPublish}
              transition={transitionLocation}
              workflowError={workflowError}
            />
          </>
        )}
      </div>
    </Container>
  );
}
