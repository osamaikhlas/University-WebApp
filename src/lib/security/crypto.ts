import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

/**
 * AES-256-GCM encryption for at-rest secrets that must be recoverable later (unlike a
 * password, which only ever needs to be verified — see src/lib/auth/password.ts). Used for
 * `Grievance.submitterContact` (CLAUDE.md rule 6: private grievance data must never be
 * exposed, including as plaintext in a database dump or backup).
 *
 * Stored format: `<iv>:<authTag>:<ciphertext>`, each hex-encoded. The auth tag makes any
 * tampering with the stored value detectable — `decryptSecret` throws rather than returning
 * corrupted plaintext.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;

function getKey(): Buffer {
  if (!env.GRIEVANCE_ENCRYPTION_KEY) {
    throw new Error(
      "GRIEVANCE_ENCRYPTION_KEY is not set. Generate one with: " +
        `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    );
  }
  return Buffer.from(env.GRIEVANCE_ENCRYPTION_KEY, "hex");
}

export function encryptSecret(plainText: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptSecret(storedValue: string): string {
  const key = getKey();
  const [ivHex, authTagHex, cipherTextHex] = storedValue.split(":");
  if (!ivHex || !authTagHex || !cipherTextHex) {
    throw new Error("Malformed encrypted value: expected `<iv>:<authTag>:<ciphertext>`");
  }

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherTextHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
