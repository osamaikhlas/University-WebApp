import bcrypt from "bcryptjs";

/**
 * Password hashing (docs/architecture.md §3: "hashed with a strong adaptive algorithm").
 * bcryptjs is a pure-JS implementation, so it needs no native build step in any
 * environment this app runs in; cost factor 12 is a reasonable balance of security vs.
 * login latency as of 2026.
 */
const BCRYPT_COST_FACTOR = 12;

export async function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, BCRYPT_COST_FACTOR);
}

export async function verifyPassword(
  plainTextPassword: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, passwordHash);
}
