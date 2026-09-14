import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("logAudit", () => {
  it("writes actor/action/entity fields straight through", async () => {
    await logAudit({
      actorId: "user-1",
      action: "CREATE",
      entityType: "Department",
      entityId: "dept-1",
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "user-1",
        action: "CREATE",
        entityType: "Department",
        entityId: "dept-1",
      }),
    });
  });

  it("omits before/after snapshots entirely when not given", async () => {
    await logAudit({ actorId: "user-1", action: "CREATE", entityType: "Department", entityId: "dept-1" });

    const data = vi.mocked(prisma.auditLog.create).mock.calls[0]![0].data;
    expect(data.beforeSnapshot).toBeUndefined();
    expect(data.afterSnapshot).toBeUndefined();
  });

  it("serializes Date fields in a snapshot to plain JSON (ISO strings), not raw Date objects", async () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");

    await logAudit({
      actorId: "user-1",
      action: "UPDATE",
      entityType: "Department",
      entityId: "dept-1",
      after: { name: "Computer Science", createdAt },
    });

    const data = vi.mocked(prisma.auditLog.create).mock.calls[0]![0].data;
    expect(data.afterSnapshot).toEqual({ name: "Computer Science", createdAt: createdAt.toISOString() });
  });
});
