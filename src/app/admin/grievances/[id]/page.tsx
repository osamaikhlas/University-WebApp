import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security/crypto";
import { getEligibleGrievanceAssignees } from "@/lib/admin/grievance-assignees";
import { canAssignFrom } from "@/lib/grievance-workflow";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { GrievanceStatusBadge } from "@/components/admin/GrievanceStatusBadge";
import { GrievanceWorkflowActions } from "@/components/admin/GrievanceWorkflowActions";
import {
  addGrievanceNoteAction,
  addGrievanceResponseAction,
  assignGrievanceAction,
  transitionGrievanceAction,
} from "@/app/admin/grievances/actions";

export const metadata: Metadata = { title: "Grievance" };
export const dynamic = "force-dynamic";

/** Never lets a corrupt/undecryptable value crash the page — surfaces it plainly instead so
 * staff can still see everything else about the case. */
function safeDecrypt(value: string | null): string | null {
  if (!value) return null;
  try {
    return decryptSecret(value);
  } catch {
    return "[unable to decrypt]";
  }
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE: "Submitted",
  GRIEVANCE_ASSIGN: "Assigned",
  GRIEVANCE_STATUS_CHANGE: "Status changed",
  GRIEVANCE_NOTE_ADDED: "Internal note added",
  GRIEVANCE_RESPONSE_SENT: "Response recorded",
};

export default async function GrievanceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ workflowError?: string; noteError?: string; responseError?: string }>;
}) {
  const user = await requirePermission("grievances:view");
  const { id } = await params;
  const { workflowError, noteError, responseError } = await searchParams;

  const grievance = await prisma.grievance.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      responses: {
        orderBy: { createdAt: "desc" },
        include: { respondedBy: { select: { name: true } } },
      },
      attachments: { orderBy: { uploadedAt: "asc" } },
    },
  });
  if (!grievance) notFound();

  const canManage = hasPermission(user.permissions, "grievances:manage");

  const [auditEntries, eligibleAssignees] = await Promise.all([
    prisma.auditLog.findMany({
      where: { entityType: "Grievance", entityId: id },
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { name: true } } },
    }),
    canManage && canAssignFrom(grievance.status)
      ? getEligibleGrievanceAssignees(grievance.collegeId)
      : Promise.resolve([]),
  ]);

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading title={grievance.subject} description={`Reference ${grievance.referenceNumber}`} />
          <GrievanceStatusBadge status={grievance.status} />
        </div>

        {grievance.isPlaceholder ? <DemoDataNotice /> : null}

        <Alert tone="warning" title="Confidential">
          Visible only to staff holding the Grievances permission. Never shown to the public.
        </Alert>

        <Card>
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-foreground/70">Submitter name</dt>
              <dd className="mt-1">{grievance.submitterName}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Category</dt>
              <dd className="mt-1">{grievance.category}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Email</dt>
              <dd className="mt-1">{safeDecrypt(grievance.submitterEmail)}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Phone</dt>
              <dd className="mt-1">{safeDecrypt(grievance.submitterPhone) ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Assigned to</dt>
              <dd className="mt-1">{grievance.assignedTo?.name ?? "Unassigned"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground/70">Submitted</dt>
              <dd className="mt-1">{grievance.createdAt.toLocaleString()}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-medium text-foreground/70">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap">{grievance.description}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-3 text-base font-semibold">Attachments</h2>
          {grievance.attachments.length === 0 ? (
            <p className="text-sm text-foreground/60">No attachments.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {grievance.attachments.map((attachment) => (
                <li key={attachment.id}>
                  <a
                    href={`/api/admin/grievances/${grievance.id}/attachments/${attachment.id}`}
                    className="text-brand hover:underline"
                  >
                    {attachment.fileName}
                  </a>
                  <span className="ml-2 text-foreground/60">
                    ({Math.ceil(attachment.sizeBytes / 1024)} KB)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {canManage ? (
          <Card>
            <h2 className="mb-3 text-base font-semibold">Assign</h2>
            {canAssignFrom(grievance.status) ? (
              eligibleAssignees.length > 0 ? (
                <form
                  action={assignGrievanceAction.bind(null, grievance.id)}
                  className="flex flex-wrap items-end gap-3"
                >
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="assigneeId" className="text-sm font-medium">
                      Staff member
                    </label>
                    <select
                      id="assigneeId"
                      name="assigneeId"
                      defaultValue={grievance.assignedToId ?? ""}
                      className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm"
                    >
                      <option value="" disabled>
                        Select a staff member
                      </option>
                      {eligibleAssignees.map((assignee) => (
                        <option key={assignee.id} value={assignee.id}>
                          {assignee.name} ({assignee.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" variant="secondary">
                    {grievance.assignedToId ? "Reassign" : "Assign"}
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-foreground/60">
                  No eligible staff to assign — grant someone the Grievances permission first.
                </p>
              )
            ) : (
              <p className="text-sm text-foreground/60">
                Reopen this grievance to change its assignment.
              </p>
            )}
          </Card>
        ) : null}

        {canManage ? (
          <Card>
            <h2 className="mb-3 text-base font-semibold">Status</h2>
            <GrievanceWorkflowActions
              grievanceId={grievance.id}
              status={grievance.status}
              transition={transitionGrievanceAction}
              workflowError={workflowError}
            />
          </Card>
        ) : null}

        <Card>
          <h2 className="mb-3 text-base font-semibold">Internal notes</h2>
          <p className="mb-3 text-xs text-foreground/60">
            Never shown to the submitter or the public — for staff case tracking only.
          </p>
          {noteError ? (
            <Alert tone="danger" className="mb-3">
              {noteError}
            </Alert>
          ) : null}
          {canManage ? (
            <form action={addGrievanceNoteAction.bind(null, grievance.id)} className="mb-4 flex flex-col gap-2">
              <textarea
                name="note"
                rows={2}
                required
                placeholder="Add an internal note…"
                className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm"
              />
              <Button type="submit" variant="secondary" className="self-start">
                Add note
              </Button>
            </form>
          ) : null}
          {grievance.notes.length === 0 ? (
            <p className="text-sm text-foreground/60">No notes yet.</p>
          ) : (
            <ul className="flex flex-col gap-3 text-sm">
              {grievance.notes.map((note) => (
                <li key={note.id} className="rounded-md border border-border-subtle p-3">
                  <p className="whitespace-pre-wrap">{note.note}</p>
                  <p className="mt-1 text-xs text-foreground/60">
                    {note.author?.name ?? "Unknown"} · {note.createdAt.toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-base font-semibold">Responses to submitter</h2>
          <p className="mb-3 text-xs text-foreground/60">
            This system has no automated email delivery — a response here is the official
            record of what staff communicated back, not proof it was sent.
          </p>
          {responseError ? (
            <Alert tone="danger" className="mb-3">
              {responseError}
            </Alert>
          ) : null}
          {canManage ? (
            <form
              action={addGrievanceResponseAction.bind(null, grievance.id)}
              className="mb-4 flex flex-col gap-2"
            >
              <textarea
                name="message"
                rows={3}
                required
                placeholder="Record the response given to the submitter…"
                className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm"
              />
              <Button type="submit" variant="secondary" className="self-start">
                Record response
              </Button>
            </form>
          ) : null}
          {grievance.responses.length === 0 ? (
            <p className="text-sm text-foreground/60">No responses recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-3 text-sm">
              {grievance.responses.map((response) => (
                <li key={response.id} className="rounded-md border border-border-subtle p-3">
                  <p className="whitespace-pre-wrap">{response.message}</p>
                  <p className="mt-1 text-xs text-foreground/60">
                    {response.respondedBy.name} · {response.createdAt.toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-base font-semibold">Audit history</h2>
          {auditEntries.length === 0 ? (
            <p className="text-sm text-foreground/60">No audit entries yet.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {auditEntries.map((entry) => (
                <li key={entry.id} className="border-b border-border-subtle pb-2 last:border-0">
                  <span className="font-medium">
                    {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                  </span>{" "}
                  <span className="text-foreground/60">
                    by {entry.actor?.name ?? "System / anonymous submitter"} ·{" "}
                    {entry.createdAt.toLocaleString()}
                  </span>
                  {entry.comment ? <p className="mt-0.5 text-foreground/70">{entry.comment}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Link href="/admin/grievances" className="text-sm text-brand hover:underline">
          ← Back to grievances
        </Link>
      </div>
    </Container>
  );
}
