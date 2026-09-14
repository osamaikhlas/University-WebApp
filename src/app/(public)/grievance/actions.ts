"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import { encryptSecret } from "@/lib/security/crypto";

/**
 * Grievance submission. Per CLAUDE.md rule 6, this is write-only from the public side: this
 * file has no query that lists or returns past submissions to any caller, public or
 * otherwise. `submitterContact` is encrypted before it ever reaches Prisma (see
 * src/lib/security/crypto.ts) — the database never holds it as plaintext.
 */

const grievanceSchema = z.object({
  submitterName: z.string().trim().max(200).optional(),
  submitterContact: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  description: z
    .string()
    .trim()
    .min(10, "Please describe the grievance in at least 10 characters.")
    .max(5000),
});

export type GrievanceFormState = {
  status: "idle" | "error" | "success";
  error: string | null;
};

export async function submitGrievance(
  _prevState: GrievanceFormState,
  formData: FormData,
): Promise<GrievanceFormState> {
  const parsed = grievanceSchema.safeParse({
    submitterName: formData.get("submitterName") || undefined,
    submitterContact: formData.get("submitterContact") || undefined,
    category: formData.get("category") || undefined,
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { status: "error", error: "Grievance submission is not available right now." };
  }

  const { submitterName, submitterContact, category, description } = parsed.data;

  await prisma.grievance.create({
    data: {
      collegeId: college.id,
      submitterName: submitterName ?? null,
      submitterContact: submitterContact ? encryptSecret(submitterContact) : null,
      category: category ?? null,
      description,
      status: "NEW",
      isPlaceholder: false,
    },
  });

  return { status: "success", error: null };
}
