import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { auditLog: { create: vi.fn(), findFirst: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { logAudit, getLatestActionComment } from "@/lib/audit";

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

  it("accepts a null actorId for system-generated or genuinely unauthenticated entries", async () => {
    await logAudit({
      actorId: null,
      action: "CREATE",
      entityType: "Grievance",
      entityId: "g1",
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ actorId: null }),
    });
  });

  it("records metadata, comment, and ipAddress alongside the snapshots", async () => {
    await logAudit({
      actorId: "user-1",
      action: "ROLE_CHANGE",
      entityType: "User",
      entityId: "user-2",
      before: { roles: ["EDITOR"] },
      after: { roles: ["EDITOR", "REVIEWER"] },
      comment: "Promoted to also review content.",
      metadata: { changeType: "added", role: "REVIEWER" },
      ipAddress: "203.0.113.1",
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: "user-1",
        action: "ROLE_CHANGE",
        entityType: "User",
        entityId: "user-2",
        beforeSnapshot: { roles: ["EDITOR"] },
        afterSnapshot: { roles: ["EDITOR", "REVIEWER"] },
        comment: "Promoted to also review content.",
        metadata: { changeType: "added", role: "REVIEWER" },
        ipAddress: "203.0.113.1",
      },
    });
  });

  it("omits metadata entirely when not given, rather than writing an empty object", async () => {
    await logAudit({ actorId: "user-1", action: "LOGIN", entityType: "User", entityId: "user-1" });

    const data = vi.mocked(prisma.auditLog.create).mock.calls[0]![0].data;
    expect(data.metadata).toBeUndefined();
  });
});

describe("getLatestActionComment", () => {
  it("returns the comment, actor name, and timestamp of the most recent matching entry", async () => {
    const createdAt = new Date("2026-02-01T00:00:00.000Z");
    vi.mocked(prisma.auditLog.findFirst).mockResolvedValue({
      comment: "Publish date needs to be corrected.",
      createdAt,
      actor: { name: "Rina Reviewer" },
    } as never);

    const result = await getLatestActionComment({
      entityType: "Notice",
      entityId: "notice-1",
      action: "REQUEST_UPDATE",
    });

    expect(result).toEqual({
      comment: "Publish date needs to be corrected.",
      actorName: "Rina Reviewer",
      createdAt,
    });
    expect(prisma.auditLog.findFirst).toHaveBeenCalledWith({
      where: {
        entityType: "Notice",
        entityId: "notice-1",
        action: "REQUEST_UPDATE",
        comment: { not: null },
      },
      orderBy: { createdAt: "desc" },
      include: { actor: true },
    });
  });

  it("queries only entries carrying a comment, ordered most-recent-first", async () => {
    vi.mocked(prisma.auditLog.findFirst).mockResolvedValue(null);

    await getLatestActionComment({ entityType: "Notice", entityId: "notice-1", action: "REQUEST_UPDATE" });

    const args = vi.mocked(prisma.auditLog.findFirst).mock.calls[0]![0]!;
    expect(args.where).toMatchObject({ comment: { not: null } });
    expect(args.orderBy).toEqual({ createdAt: "desc" });
  });

  it("returns null when no matching entry exists, rather than throwing", async () => {
    vi.mocked(prisma.auditLog.findFirst).mockResolvedValue(null);

    const result = await getLatestActionComment({
      entityType: "Notice",
      entityId: "notice-1",
      action: "REQUEST_UPDATE",
    });

    expect(result).toBeNull();
  });

  it("returns null when the actor relation is missing but falls back to a generic label internally only if a comment exists", async () => {
    vi.mocked(prisma.auditLog.findFirst).mockResolvedValue({
      comment: "Needs a correction.",
      createdAt: new Date("2026-02-01T00:00:00.000Z"),
      actor: null,
    } as never);

    const result = await getLatestActionComment({
      entityType: "Notice",
      entityId: "notice-1",
      action: "REQUEST_UPDATE",
    });

    expect(result?.actorName).toBe("A reviewer");
  });
});
