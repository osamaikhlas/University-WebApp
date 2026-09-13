import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

/**
 * Singleton Prisma client, using the @prisma/adapter-pg driver adapter (required as of
 * Prisma ORM 7 — the datasource block in schema.prisma no longer carries a `url`).
 *
 * Creating the adapter/client does not open a connection — `pg.Pool` and PrismaClient both
 * connect lazily on first query — so this module is safe to import even when no database
 * is reachable (see src/lib/env.ts and src/app/api/health/route.ts).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
