import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { grievance: { create: vi.fn() } },
}));

vi.mock("@/lib/content", () => ({
  getPrimaryCollege: vi.fn(),
}));

vi.mock("@/lib/security/crypto", () => ({
  encryptSecret: vi.fn((value: string) => `encrypted(${value})`),
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPrimaryCollege).mockResolvedValue({ id: "college-1", isPlaceholder: true } as never);
});

describe("submitGrievance validation", () => {
  it("rejects a description shorter than 10 characters", async () => {
    const result = await submitGrievance(
      { status: "idle", error: null },
      formData({ description: "too short" }),
    );
    expect(result.status).toBe("error");
    expect(prisma.grievance.create).not.toHaveBeenCalled();
  });

  it("accepts a submission with only a description (fully anonymous)", async () => {
    vi.mocked(prisma.grievance.create).mockResolvedValue({} as never);

    const result = await submitGrievance(
      { status: "idle", error: null },
      formData({ description: "This is a sufficiently long grievance description." }),
    );

    expect(result.status).toBe("success");
    expect(prisma.grievance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        collegeId: "college-1",
        submitterName: null,
        submitterContact: null,
        category: null,
        status: "NEW",
        isPlaceholder: false,
      }),
    });
  });
});

describe("submitGrievance contact encryption", () => {
  it("encrypts submitterContact before it reaches Prisma, never storing it in plaintext", async () => {
    vi.mocked(prisma.grievance.create).mockResolvedValue({} as never);

    await submitGrievance(
      { status: "idle", error: null },
      formData({
        description: "This is a sufficiently long grievance description.",
        submitterContact: "student@example.invalid",
      }),
    );

    // The real encrypt/decrypt round-trip (including the plaintext-never-appears-as-is
    // guarantee) is covered by tests/unit/security/crypto.test.ts; this test only checks
    // that submitGrievance routes the raw contact string through encryptSecret rather than
    // writing it to Prisma directly.
    expect(encryptSecret).toHaveBeenCalledWith("student@example.invalid");
    const createArgs = vi.mocked(prisma.grievance.create).mock.calls[0][0];
    expect(createArgs.data.submitterContact).toBe("encrypted(student@example.invalid)");
  });
});

describe("submitGrievance when no college exists yet", () => {
  it("returns an error and never calls Prisma", async () => {
    vi.mocked(getPrimaryCollege).mockResolvedValue(null);

    const result = await submitGrievance(
      { status: "idle", error: null },
      formData({ description: "This is a sufficiently long grievance description." }),
    );

    expect(result.status).toBe("error");
    expect(prisma.grievance.create).not.toHaveBeenCalled();
  });
});
