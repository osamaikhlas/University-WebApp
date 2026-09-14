"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { MODULE_PERMISSIONS } from "@/lib/admin/module-permissions";
import { applyWorkflowTransition, WorkflowError, type WorkflowActionName } from "@/lib/content-workflow";
import { logAudit } from "@/lib/audit";
import { getPrimaryCollege } from "@/lib/content";

const PERMISSIONS = MODULE_PERMISSIONS.contact;
const ENTITY_TYPE = "Contact";

const CONTACT_TYPES = ["PHONE", "EMAIL", "OTHER"] as const;

const contactSchema = z.object({
  type: z.enum(CONTACT_TYPES, { error: "Select a valid contact type" }),
  value: z.string().trim().min(1, "Value is required").max(300),
  label: z.string().trim().max(200).optional(),
});

export type ContactFormState = { error: string | null };

function parseForm(formData: FormData) {
  return contactSchema.safeParse({
    type: formData.get("type"),
    value: formData.get("value"),
    label: formData.get("label") || undefined,
  });
}

export async function createContact(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { error: "No college record exists yet — cannot create content." };
  }

  const contact = await prisma.contact.create({
    data: {
      collegeId: college.id,
      type: parsed.data.type,
      value: parsed.data.value,
      label: parsed.data.label || null,
      status: "DRAFT",
      isPlaceholder: false,
      createdBy: user.id,
      updatedBy: user.id,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "CREATE",
    entityType: ENTITY_TYPE,
    entityId: contact.id,
    after: contact,
  });

  redirect(`/admin/contact/${contact.id}`);
}

export async function updateContact(
  id: string,
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const user = await requirePermission(PERMISSIONS.manage);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const before = await prisma.contact.findUnique({ where: { id } });
  if (!before) {
    return { error: "Contact not found." };
  }

  const after = await prisma.contact.update({
    where: { id },
    data: {
      type: parsed.data.type,
      value: parsed.data.value,
      label: parsed.data.label || null,
      updatedBy: user.id,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "UPDATE",
    entityType: ENTITY_TYPE,
    entityId: id,
    before,
    after,
  });

  redirect(`/admin/contact/${id}`);
}

export async function transitionContact(
  id: string,
  action: WorkflowActionName,
  _formData: FormData,
): Promise<void> {
  const user = await requirePermission(
    action === "submit_for_review" ? PERMISSIONS.manage : PERMISSIONS.publish,
  );

  const contact = await prisma.contact.findUniqueOrThrow({ where: { id } });

  try {
    await applyWorkflowTransition({
      entityType: ENTITY_TYPE,
      entityId: id,
      currentStatus: contact.status,
      action,
      actorId: user.id,
      update: (data) => prisma.contact.update({ where: { id }, data }),
    });
  } catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
  }

  redirect(`/admin/contact/${id}`);
}
