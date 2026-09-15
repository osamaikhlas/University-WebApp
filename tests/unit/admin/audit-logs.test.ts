import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  AUDIT_ACTIONS,
  getAuditLogEntry,
  getAuditLogPage,
  humanizeAuditAction,
  isAuditAction,
} from "@/lib/admin/audit-logs";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
  vi.mocked(prisma.auditLog.count).mockResolvedValue(0);
});

describe("isAuditAction", () => {
  it("accepts every declared action and rejects anything else", () => {
    for (const action of AUDIT_ACTIONS) {
      expect(isAuditAction(action)).toBe(true);
    }
    expect(isAuditAction("NOT_A_REAL_ACTION")).toBe(false);
  });
});

describe("humanizeAuditAction", () => {
  it("title-cases the first word and lowercases the rest, joined by spaces", () => {
    expect(humanizeAuditAction("CREATE")).toBe("Create");
    expect(humanizeAuditAction("START_REVIEW")).toBe("Start review");
    expect(humanizeAuditAction("GRIEVANCE_ASSIGN")).toBe("Grievance assign");
  });
});

describe("getAuditLogPage", () => {
  it("filters by entity type, action, and actor together", async () => {
    await getAuditLogPage({ entityType: "Grievance", action: "GRIEVANCE_ASSIGN", actorQuery: "jane", page: 1 });

    const call = vi.mocked(prisma.auditLog.findMany).mock.calls[0]![0]!;
    expect(call.where).toMatchObject({
      entityType: { contains: "Grievance", mode: "insensitive" },
      action: "GRIEVANCE_ASSIGN",
      actor: {
        OR: [
          { name: { contains: "jane", mode: "insensitive" } },
          { email: { contains: "jane", mode: "insensitive" } },
        ],
      },
    });
  });

  it("applies no filter fields at all when none are given", async () => {
    await getAuditLogPage({});
    const call = vi.mocked(prisma.auditLog.findMany).mock.calls[0]![0]!;
    expect(call.where).toEqual({});
  });

  it("maps rows and falls back to a generic actor label when there is none", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      {
        id: "a1",
        actor: null,
        action: "CREATE",
        entityType: "Grievance",
        entityId: "g1",
        comment: null,
        createdAt: new Date("2026-01-01"),
      },
    ] as never);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(1);

    const { rows, totalCount } = await getAuditLogPage({});
    expect(rows).toEqual([
      {
        id: "a1",
        actorName: "System / anonymous",
        action: "CREATE",
        entityType: "Grievance",
        entityId: "g1",
        comment: null,
        createdAt: new Date("2026-01-01"),
      },
    ]);
    expect(totalCount).toBe(1);
  });

  it("paginates via page/pageSize, not just take", async () => {
    vi.mocked(prisma.auditLog.count).mockResolvedValue(45);
    const result = await getAuditLogPage({ page: 2 });
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(3); // 45 rows / 20 per page
  });
});

describe("getAuditLogEntry", () => {
  it("returns null for a nonexistent id", async () => {
    vi.mocked(prisma.auditLog.findUnique).mockResolvedValue(null);
    expect(await getAuditLogEntry("missing")).toBeNull();
  });

  it("includes actor name/email and every snapshot/metadata field", async () => {
    vi.mocked(prisma.auditLog.findUnique).mockResolvedValue({
      id: "a1",
      actorId: "user-1",
      actor: { name: "Jane Reviewer", email: "jane@example.invalid" },
      action: "ROLE_CHANGE",
      entityType: "User",
      entityId: "user-2",
      beforeSnapshot: { roles: ["EDITOR"] },
      afterSnapshot: { roles: ["EDITOR", "REVIEWER"] },
      metadata: { changeType: "added" },
      comment: "Promoted.",
      ipAddress: "203.0.113.1",
      createdAt: new Date("2026-01-01"),
    } as never);

    const entry = await getAuditLogEntry("a1");
    expect(entry).toMatchObject({
      actorName: "Jane Reviewer",
      actorEmail: "jane@example.invalid",
      beforeSnapshot: { roles: ["EDITOR"] },
      afterSnapshot: { roles: ["EDITOR", "REVIEWER"] },
      metadata: { changeType: "added" },
      ipAddress: "203.0.113.1",
    });
  });
});
