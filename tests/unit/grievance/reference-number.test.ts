import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { grievance: { findUnique: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { createUniqueReferenceNumber, formatReferenceNumber } from "@/lib/grievance-reference";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("formatReferenceNumber", () => {
  it("formats as GRV-YYYYMMDD-<suffix>", () => {
    const date = new Date(2026, 8, 14); // September 14, 2026
    expect(formatReferenceNumber(date, "ABC123")).toBe("GRV-20260914-ABC123");
  });

  it("pads single-digit months and days", () => {
    const date = new Date(2026, 0, 5); // January 5, 2026
    expect(formatReferenceNumber(date, "XYZ789")).toBe("GRV-20260105-XYZ789");
  });
});

describe("createUniqueReferenceNumber", () => {
  it("generates a reference number matching the expected shape, with no ambiguous characters", async () => {
    vi.mocked(prisma.grievance.findUnique).mockResolvedValue(null);

    const reference = await createUniqueReferenceNumber(new Date(2026, 8, 14));

    expect(reference).toMatch(/^GRV-20260914-[A-Z0-9]{6}$/);
    const suffix = reference.split("-")[2];
    expect(suffix).not.toMatch(/[0O1I]/);
  });

  it("retries on collision until a unique candidate is found", async () => {
    vi.mocked(prisma.grievance.findUnique)
      .mockResolvedValueOnce({ id: "existing-1" } as never)
      .mockResolvedValueOnce({ id: "existing-2" } as never)
      .mockResolvedValueOnce(null);

    const reference = await createUniqueReferenceNumber();

    expect(reference).toMatch(/^GRV-\d{8}-[A-Z0-9]{6}$/);
    expect(prisma.grievance.findUnique).toHaveBeenCalledTimes(3);
  });

  it("throws after exhausting all generation attempts", async () => {
    vi.mocked(prisma.grievance.findUnique).mockResolvedValue({ id: "always-taken" } as never);

    await expect(createUniqueReferenceNumber()).rejects.toThrow(/unique grievance reference number/);
  });
});
