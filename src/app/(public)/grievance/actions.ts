"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import { encryptSecret } from "@/lib/security/crypto";
import { createUniqueReferenceNumber } from "@/lib/grievance-reference";
import { checkRateLimit, getClientIpHash } from "@/lib/security/rate-limit";
import { saveGrievanceAttachment, AttachmentValidationError } from "@/lib/security/file-storage";
import { GRIEVANCE_CATEGORIES } from "@/lib/grievance-categories";
import { logAudit } from "@/lib/audit";

/**
 * Grievance submission. Per CLAUDE.md rule 6, this is write-only from the public side: this
 * file has no query that lists or returns past submissions to any caller. `submitterEmail`/
 * `submitterPhone` are encrypted before they ever reach Prisma (see src/lib/security/crypto.ts)
 * — the database never holds them as plaintext. Abuse protection: a per-IP rate limit
 * (src/lib/security/rate-limit.ts) plus a honeypot field the real form never shows a human.
 */

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const grievanceSchema = z.object({
  submitterName: z.string().trim().min(1, "Name is required.").max(200),
  submitterEmail: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address.")
    .max(200),
  submitterPhone: z.string().trim().max(50).optional(),
  category: z.enum(GRIEVANCE_CATEGORIES, { message: "Select a category." }),
  subject: z.string().trim().min(3, "Subject must be at least 3 characters.").max(300),
  description: z
    .string()
    .trim()
    .min(10, "Please describe the grievance in at least 10 characters.")
    .max(5000),
});

export type GrievanceFormState = {
  status: "idle" | "error" | "success";
  error: string | null;
  referenceNumber?: string;
  /** Set only alongside status "success" — the grievance itself was recorded, but its
   * attachment (if any) could not be. */
  warning?: string;
};

export async function submitGrievance(
  _prevState: GrievanceFormState,
  formData: FormData,
): Promise<GrievanceFormState> {
  // Honeypot: a hidden field real users never see or fill (see GrievanceForm.tsx). A filled
  // value means a bot — pretend success without writing anything, so the bot doesn't learn to
  // adapt.
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.length > 0) {
    return { status: "success", error: null };
  }

  const parsed = grievanceSchema.safeParse({
    submitterName: formData.get("submitterName"),
    submitterEmail: formData.get("submitterEmail"),
    submitterPhone: formData.get("submitterPhone") || undefined,
    category: formData.get("category"),
    subject: formData.get("subject"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const ipHash = await getClientIpHash();
  const rateLimit = await checkRateLimit({
    key: `grievance_submit:${ipHash}`,
    max: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    return {
      status: "error",
      error: "Too many submissions from this network recently. Please try again later.",
    };
  }

  const college = await getPrimaryCollege();
  if (!college) {
    return { status: "error", error: "Grievance submission is not available right now." };
  }

  const { submitterName, submitterEmail, submitterPhone, category, subject, description } =
    parsed.data;

  const referenceNumber = await createUniqueReferenceNumber();

  const grievance = await prisma.grievance.create({
    data: {
      collegeId: college.id,
      referenceNumber,
      submitterName,
      submitterEmail: encryptSecret(submitterEmail),
      submitterPhone: submitterPhone ? encryptSecret(submitterPhone) : null,
      submitterIpHash: ipHash,
      category,
      subject,
      description,
      status: "NEW",
      isPlaceholder: false,
    },
  });

  let attachmentError: string | null = null;
  const attachment = formData.get("attachment");
  if (attachment instanceof File && attachment.size > 0) {
    try {
      const stored = await saveGrievanceAttachment(grievance.id, attachment);
      await prisma.grievanceAttachment.create({
        data: {
          grievanceId: grievance.id,
          fileName: stored.fileName,
          storedPath: stored.storedPath,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
        },
      });
    } catch (error) {
      if (!(error instanceof AttachmentValidationError)) throw error;
      // The grievance itself is already recorded and has a valid reference number — an
      // unsupported attachment shouldn't lose the whole submission, just skip the file.
      attachmentError = error.message;
    }
  }

  // No signed-in actor for a public submission (CLAUDE.md rule 8: still traceable — the
  // hashed submitting IP is recorded on `ipAddress` instead of a user).
  await logAudit({
    actorId: null,
    action: "CREATE",
    entityType: "Grievance",
    entityId: grievance.id,
    after: { referenceNumber, status: "NEW", category },
    comment: "Public grievance submission.",
    ipAddress: ipHash,
  });

  return {
    status: "success",
    error: null,
    referenceNumber,
    warning: attachmentError ?? undefined,
  };
}
