import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    grievance: { create: vi.fn(), findUnique: vi.fn() },
    grievanceAttachment: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    rateLimitEntry: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/content", () => ({
  getPrimaryCollege: vi.fn(),
}));

vi.mock("@/lib/security/crypto", () => ({
  encryptSecret: vi.fn((value: string) => `encrypted(${value})`),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": "203.0.113.1" })),
}));

import { prisma } from "@/lib/prisma";
import { getPrimaryCollege } from "@/lib/content";
import { encryptSecret } from "@/lib/security/crypto";
import { submitGrievance } from "@/app/(public)/grievance/actions";

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const VALID_FIELDS = {
  submitterName: "Test Submitter",
  submitterEmail: "student@example.invalid",
  category: "Academic",
  subject: "A sufficiently long subject",
  description: "This is a sufficiently long grievance description.",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPrimaryCollege).mockResolvedValue({ id: "college-1", isPlaceholder: true } as never);
  vi.mocked(prisma.grievance.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.rateLimitEntry.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.rateLimitEntry.upsert).mockResolvedValue({} as never);
});

describe("submitGrievance validation", () => {
  it("rejects a description shorter than 10 characters", async () => {
    const result = await submitGrievance(
      { status: "idle", error: null },
      formData({ ...VALID_FIELDS, description: "too short" }),
    );
    expect(result.status).toBe("error");
    expect(prisma.grievance.create).not.toHaveBeenCalled();
  });

  it("rejects a missing name", async () => {
    const result = await submitGrievance(
      { status: "idle", error: null },
      formData({ ...VALID_FIELDS, submitterName: "" }),
    );
    expect(result.status).toBe("error");
    expect(prisma.grievance.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", async () => {
    const result = await submitGrievance(
      { status: "idle", error: null },
      formData({ ...VALID_FIELDS, submitterEmail: "not-an-email" }),
    );
    expect(result.status).toBe("error");
    expect(prisma.grievance.create).not.toHaveBeenCalled();
  });

  it("rejects a category outside the fixed list", async () => {
    const result = await submitGrievance(
      { status: "idle", error: null },
      formData({ ...VALID_FIELDS, category: "Not A Real Category" }),
    );
    expect(result.status).toBe("error");
    expect(prisma.grievance.create).not.toHaveBeenCalled();
  });

  it("accepts a fully valid submission and returns a reference number", async () => {
    vi.mocked(prisma.grievance.create).mockResolvedValue({ id: "grievance-1" } as never);

    const result = await submitGrievance({ status: "idle", error: null }, formData(VALID_FIELDS));

    expect(result.status).toBe("success");
    expect(result.referenceNumber).toMatch(/^GRV-\d{8}-[A-Z0-9]{6}$/);
    expect(prisma.grievance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        collegeId: "college-1",
        submitterName: "Test Submitter",
        category: "Academic",
        subject: "A sufficiently long subject",
        status: "NEW",
        isPlaceholder: false,
      }),
    });
  });
});

describe("submitGrievance contact encryption", () => {
  it("encrypts submitterEmail and submitterPhone before they reach Prisma", async () => {
    vi.mocked(prisma.grievance.create).mockResolvedValue({ id: "grievance-1" } as never);

    await submitGrievance(
      { status: "idle", error: null },
      formData({ ...VALID_FIELDS, submitterPhone: "+92-300-0000000" }),
    );

    expect(encryptSecret).toHaveBeenCalledWith("student@example.invalid");
    expect(encryptSecret).toHaveBeenCalledWith("+92-300-0000000");
    const createArgs = vi.mocked(prisma.grievance.create).mock.calls[0][0];
    expect(createArgs.data.submitterEmail).toBe("encrypted(student@example.invalid)");
    expect(createArgs.data.submitterPhone).toBe("encrypted(+92-300-0000000)");
  });

  it("leaves submitterPhone null when not provided", async () => {
    vi.mocked(prisma.grievance.create).mockResolvedValue({ id: "grievance-1" } as never);

    await submitGrievance({ status: "idle", error: null }, formData(VALID_FIELDS));

    const createArgs = vi.mocked(prisma.grievance.create).mock.calls[0][0];
    expect(createArgs.data.submitterPhone).toBeNull();
  });
});

describe("submitGrievance honeypot", () => {
  it("silently reports success without writing anything when the honeypot field is filled", async () => {
    const result = await submitGrievance(
      { status: "idle", error: null },
      formData({ ...VALID_FIELDS, website: "http://spam.example" }),
    );

    expect(result.status).toBe("success");
    expect(prisma.grievance.create).not.toHaveBeenCalled();
    expect(getPrimaryCollege).not.toHaveBeenCalled();
  });
});

describe("submitGrievance rate limiting", () => {
  it("rejects submission once the per-IP limit is exceeded", async () => {
    vi.mocked(prisma.rateLimitEntry.findUnique).mockResolvedValue({
      key: "grievance_submit:hash",
      count: 3,
      windowStart: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await submitGrievance({ status: "idle", error: null }, formData(VALID_FIELDS));

    expect(result.status).toBe("error");
    expect(result.error).toMatch(/too many/i);
    expect(prisma.grievance.create).not.toHaveBeenCalled();
  });
});

describe("submitGrievance when no college exists yet", () => {
  it("returns an error and never calls Prisma", async () => {
    vi.mocked(getPrimaryCollege).mockResolvedValue(null);

    const result = await submitGrievance({ status: "idle", error: null }, formData(VALID_FIELDS));

    expect(result.status).toBe("error");
    expect(prisma.grievance.create).not.toHaveBeenCalled();
  });
});
