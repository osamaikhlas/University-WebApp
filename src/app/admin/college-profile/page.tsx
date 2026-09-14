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
import { transitionCollegeProfile } from "@/app/admin/college-profile/actions";

export const metadata: Metadata = { title: "College Profile" };

export default async function CollegeProfilePage() {
  const user = await requirePermission(MODULE_PERMISSIONS.collegeProfile.view);
  const canManage = hasPermission(user.permissions, MODULE_PERMISSIONS.collegeProfile.manage);
  const canPublish = hasPermission(user.permissions, MODULE_PERMISSIONS.collegeProfile.publish);

  const college = await getPrimaryCollege();
  const profile = college
    ? await prisma.collegeProfile.findUnique({ where: { collegeId: college.id } })
    : null;

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading
            title="College Profile"
            description="Overview, history, vision/mission, and the Principal's message."
          />
          {profile ? (
            <div className="flex items-center gap-2">
              <StatusBadge status={profile.status} />
              {canManage ? (
                <LinkButton href="/admin/college-profile/edit" variant="secondary">
                  Edit
                </LinkButton>
              ) : null}
            </div>
          ) : null}
        </div>

        {!profile ? (
          <EmptyState
            title="No college profile has been created yet."
            action={canManage ? <LinkButton href="/admin/college-profile/new">Create profile</LinkButton> : undefined}
          />
        ) : (
          <>
            {profile.isPlaceholder ? <DemoDataNotice /> : null}

            <Card>
              <dl className="flex flex-col gap-4 text-sm">
                <div>
                  <dt className="font-medium text-foreground/70">Overview</dt>
                  <dd className="mt-1 whitespace-pre-wrap">{profile.overview ?? "—"}</dd>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-foreground/70">Vision</dt>
                    <dd className="mt-1 whitespace-pre-wrap">{profile.visionStatement ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground/70">Mission</dt>
                    <dd className="mt-1 whitespace-pre-wrap">{profile.missionStatement ?? "—"}</dd>
                  </div>
                </div>
                <div>
                  <dt className="font-medium text-foreground/70">History</dt>
                  <dd className="mt-1 whitespace-pre-wrap">{profile.history ?? "—"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground/70">Established</dt>
                  <dd className="mt-1">{profile.establishedYear ?? "—"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground/70">Principal</dt>
                  <dd className="mt-1">{profile.principalName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground/70">Principal&apos;s message</dt>
                  <dd className="mt-1 whitespace-pre-wrap">{profile.principalMessage ?? "—"}</dd>
                </div>
              </dl>
            </Card>

            <WorkflowActions
              entityId={profile.id}
              status={profile.status}
              canManage={canManage}
              canPublish={canPublish}
              transition={transitionCollegeProfile}
            />
          </>
        )}
      </div>
    </Container>
  );
}
