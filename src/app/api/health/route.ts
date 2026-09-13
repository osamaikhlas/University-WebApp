import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

// Never statically evaluated at build time (build must succeed with no database available).
export const dynamic = "force-dynamic";

type DatabaseStatus = "ok" | "unreachable";

async function checkDatabase(): Promise<DatabaseStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch {
    return "unreachable";
  }
}

export async function GET() {
  const database = await checkDatabase();
  const status = database === "ok" ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      checks: {
        database,
      },
    },
    { status: status === "ok" ? 200 : 503 },
  );
}
