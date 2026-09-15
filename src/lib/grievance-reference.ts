import "server-only";

import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Public grievance reference numbers (`GRV-YYYYMMDD-XXXXXX`). The suffix is 6 random
 * characters from a Crockford-ish alphabet (no `0/O/1/I`, which are easy to confuse when read
 * aloud or transcribed by hand) rather than a sequential id — a grievance's reference number
 * must never let anyone guess a neighboring one, since there is currently no public "look up
 * my grievance" page but the number is still handed to the submitter to quote back to staff.
 */
const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SUFFIX_LENGTH = 6;
const MAX_GENERATION_ATTEMPTS = 10;

function randomSuffix(): string {
  let suffix = "";
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  }
  return suffix;
}

export function formatReferenceNumber(date: Date, suffix: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `GRV-${year}${month}${day}-${suffix}`;
}

/** Generates a reference number guaranteed unique against the database, retrying on the
 * (astronomically unlikely) collision. */
export async function createUniqueReferenceNumber(now: Date = new Date()): Promise<string> {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const candidate = formatReferenceNumber(now, randomSuffix());
    const existing = await prisma.grievance.findUnique({
      where: { referenceNumber: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  throw new Error("Could not generate a unique grievance reference number after several attempts.");
}
