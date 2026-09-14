import { z } from "zod";

/**
 * Environment variable schema for the application.
 *
 * Validation checks presence/format only — it does not verify connectivity (e.g. that
 * DATABASE_URL points at a reachable database). Connectivity is checked at runtime by
 * consumers such as the health-check endpoint (`src/app/api/health/route.ts`), never at
 * module load or build time, so `next build` never requires a live database.
 *
 * Add new variables here as later phases introduce them (auth secrets, storage keys, SMTP,
 * etc.) rather than reading `process.env` directly elsewhere in the codebase.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .url("DATABASE_URL must be a valid connection string URL"),
  NEXT_PUBLIC_SITE_NAME: z
    .string()
    .min(1)
    .default("[PLACEHOLDER] Affiliated College Portal"),
  // Absolute origin (no trailing slash) used to build absolute URLs for SEO metadata that
  // requires them — sitemap.xml, robots.txt, and Open Graph/canonical tags (src/app/sitemap.ts,
  // src/app/robots.ts). Defaults to localhost so dev/test never need to set it.
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url("NEXT_PUBLIC_SITE_URL must be a valid absolute URL")
    .default("http://localhost:3000"),
  // 32-byte AES-256-GCM key, hex-encoded (64 hex characters). Encrypts Grievance.submitterContact
  // at rest (CLAUDE.md rule 6). Optional here (presence/format only, like every other var in
  // this file) so the app still boots without it — src/lib/security/crypto.ts throws its own
  // clear error only when a grievance submission actually needs to encrypt something.
  GRIEVANCE_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, "GRIEVANCE_ENCRYPTION_KEY must be 64 hex characters (32 bytes)")
    .optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parses and validates a raw environment object against {@link envSchema}.
 * Exposed separately from the module-level `env` singleton so it can be unit tested
 * with arbitrary input instead of mutating `process.env`.
 */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  return result.data;
}

export const env = parseEnv(process.env);
