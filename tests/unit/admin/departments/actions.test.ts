import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    department: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("@/lib/auth/guard", () => ({ requirePermission: vi.fn() }));
vi.mock("@/lib/content", () => ({ getPrimaryCollege: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { getPrimaryCollege } from "@/lib/content";
import { redirect } from "next/navigation";
import {
  createDepartment,
  transitionDepartment,
  updateDepartment,
} from "@/app/admin/departments/actions";

const fakeUser = { id: "user-1", collegeId: "college-1", permissions: new Set() } as never;
const college = { id: "college-1" } as never;

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requirePermission).mockResolvedValue(fakeUser);
  vi.mocked(getPrimaryCollege).mockResolvedValue(college);
});

describe("createDepartment", () => {
  it("requires the content_general:manage permission", async () => {
    vi.mocked(prisma.department.create).mockResolvedValue({ id: "dept-1" } as never);
    await expect(
      createDepartment({ error: null }, formData({ name: "Computer Science" })),
    ).rejects.toThrow("REDIRECT:/admin/departments/dept-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("rejects a blank name without touching the database", async () => {
    const result = await createDepartment({ error: null }, formData({ name: "" }));
    expect(result.error).toBeTruthy();
    expect(prisma.department.create).not.toHaveBeenCalled();
  });

  it("creates a DRAFT, non-placeholder record and writes a CREATE audit entry", async () => {
    vi.mocked(prisma.department.create).mockResolvedValue({ id: "dept-1" } as never);

    await expect(
      createDepartment(
        { error: null },
        formData({ name: "Computer Science", description: "CS dept" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/departments/dept-1");

    expect(prisma.department.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        collegeId: "college-1",
        name: "Computer Science",
        description: "CS dept",
        status: "DRAFT",
        isPlaceholder: false,
        createdBy: "user-1",
        updatedBy: "user-1",
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "CREATE", entityType: "Department" }),
      }),
    );
  });

  it("returns an error instead of creating anything when there is no college yet", async () => {
    vi.mocked(getPrimaryCollege).mockResolvedValue(null);
    const result = await createDepartment({ error: null }, formData({ name: "Computer Science" }));
    expect(result.error).toBeTruthy();
    expect(prisma.department.create).not.toHaveBeenCalled();
  });
});

describe("updateDepartment", () => {
  it("requires the content_general:manage permission", async () => {
    vi.mocked(prisma.department.findUnique).mockResolvedValue({ id: "dept-1" } as never);
    vi.mocked(prisma.department.update).mockResolvedValue({ id: "dept-1" } as never);

    await expect(
      updateDepartment("dept-1", { error: null }, formData({ name: "Updated Name" })),
    ).rejects.toThrow("REDIRECT:/admin/departments/dept-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
  });

  it("returns an error when the department doesn't exist", async () => {
    vi.mocked(prisma.department.findUnique).mockResolvedValue(null);
    const result = await updateDepartment("missing", { error: null }, formData({ name: "X" }));
    expect(result.error).toBeTruthy();
    expect(prisma.department.update).not.toHaveBeenCalled();
  });

  it("updates fields and logs an UPDATE audit entry with before/after snapshots", async () => {
    vi.mocked(prisma.department.findUnique).mockResolvedValue({
      id: "dept-1",
      name: "Old Name",
    } as never);
    vi.mocked(prisma.department.update).mockResolvedValue({
      id: "dept-1",
      name: "New Name",
    } as never);

    await expect(
      updateDepartment("dept-1", { error: null }, formData({ name: "New Name" })),
    ).rejects.toThrow("REDIRECT:/admin/departments/dept-1");

    expect(prisma.department.update).toHaveBeenCalledWith({
      where: { id: "dept-1" },
      data: expect.objectContaining({ name: "New Name", updatedBy: "user-1" }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "UPDATE" }) }),
    );
  });
});

describe("transitionDepartment", () => {
  it("requires content_general:manage for submit_for_review (DRAFT -> SUBMITTED)", async () => {
    vi.mocked(prisma.department.findUniqueOrThrow).mockResolvedValue({
      id: "dept-1",
      status: "DRAFT",
    } as never);
    vi.mocked(prisma.department.update).mockResolvedValue({} as never);

    await expect(
      transitionDepartment("dept-1", "submit_for_review", new FormData()),
    ).rejects.toThrow("REDIRECT:/admin/departments/dept-1");
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
    expect(prisma.department.update).toHaveBeenCalledWith({
      where: { id: "dept-1" },
      data: expect.objectContaining({ status: "SUBMITTED" }),
    });
  });

  it("requires content_general:publish for start_review (SUBMITTED -> UNDER_REVIEW)", async () => {
    vi.mocked(prisma.department.findUniqueOrThrow).mockResolvedValue({
      id: "dept-1",
      status: "SUBMITTED",
    } as never);
    vi.mocked(prisma.department.update).mockResolvedValue({} as never);

    await expect(transitionDepartment("dept-1", "start_review", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/departments/dept-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
    expect(prisma.department.update).toHaveBeenCalledWith({
      where: { id: "dept-1" },
      data: expect.objectContaining({ status: "UNDER_REVIEW" }),
    });
  });

  it("requires content_general:publish for approve (UNDER_REVIEW -> APPROVED)", async () => {
    vi.mocked(prisma.department.findUniqueOrThrow).mockResolvedValue({
      id: "dept-1",
      status: "UNDER_REVIEW",
    } as never);
    vi.mocked(prisma.department.update).mockResolvedValue({} as never);

    await expect(transitionDepartment("dept-1", "approve", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/departments/dept-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
    expect(prisma.department.update).toHaveBeenCalledWith({
      where: { id: "dept-1" },
      data: expect.objectContaining({ status: "APPROVED" }),
    });
  });

  it("rejecting UNDER_REVIEW content without a reason is refused and never updates the record", async () => {
    vi.mocked(prisma.department.findUniqueOrThrow).mockResolvedValue({
      id: "dept-1",
      status: "UNDER_REVIEW",
    } as never);

    await expect(transitionDepartment("dept-1", "reject", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/departments/dept-1?workflowError=",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
    expect(prisma.department.update).not.toHaveBeenCalled();
  });

  it("rejects UNDER_REVIEW -> DRAFT and records the rejection reason once one is given", async () => {
    vi.mocked(prisma.department.findUniqueOrThrow).mockResolvedValue({
      id: "dept-1",
      status: "UNDER_REVIEW",
    } as never);
    vi.mocked(prisma.department.update).mockResolvedValue({} as never);

    await expect(
      transitionDepartment("dept-1", "reject", formData({ comment: "Description is empty." })),
    ).rejects.toThrow("REDIRECT:/admin/departments/dept-1");
    expect(prisma.department.update).toHaveBeenCalledWith({
      where: { id: "dept-1" },
      data: expect.objectContaining({ status: "DRAFT" }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "REJECT", comment: "Description is empty." }),
      }),
    );
  });

  it("applies publish (APPROVED -> PUBLISHED) via the injected update callback bound to this department", async () => {
    vi.mocked(prisma.department.findUniqueOrThrow).mockResolvedValue({
      id: "dept-1",
      status: "APPROVED",
    } as never);
    vi.mocked(prisma.department.update).mockResolvedValue({} as never);

    await expect(transitionDepartment("dept-1", "publish", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/departments/dept-1",
    );

    expect(prisma.department.update).toHaveBeenCalledWith({
      where: { id: "dept-1" },
      data: expect.objectContaining({ status: "PUBLISHED", publishedBy: "user-1" }),
    });
  });

  it("requires content_general:publish for request_update (PUBLISHED -> UPDATE_REQUIRED)", async () => {
    vi.mocked(prisma.department.findUniqueOrThrow).mockResolvedValue({
      id: "dept-1",
      status: "PUBLISHED",
    } as never);
    vi.mocked(prisma.department.update).mockResolvedValue({} as never);

    await expect(transitionDepartment("dept-1", "request_update", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/departments/dept-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:publish");
    expect(prisma.department.update).toHaveBeenCalledWith({
      where: { id: "dept-1" },
      data: expect.objectContaining({ status: "UPDATE_REQUIRED" }),
    });
  });

  it("requires content_general:manage for return_to_draft (UPDATE_REQUIRED -> DRAFT)", async () => {
    vi.mocked(prisma.department.findUniqueOrThrow).mockResolvedValue({
      id: "dept-1",
      status: "UPDATE_REQUIRED",
    } as never);
    vi.mocked(prisma.department.update).mockResolvedValue({} as never);

    await expect(transitionDepartment("dept-1", "return_to_draft", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/departments/dept-1",
    );
    expect(requirePermission).toHaveBeenCalledWith("content_general:manage");
    expect(prisma.department.update).toHaveBeenCalledWith({
      where: { id: "dept-1" },
      data: expect.objectContaining({ status: "DRAFT" }),
    });
  });

  it("does not crash on an illegal transition (race condition) — redirects back with an error", async () => {
    vi.mocked(prisma.department.findUniqueOrThrow).mockResolvedValue({
      id: "dept-1",
      status: "DRAFT",
    } as never);

    await expect(transitionDepartment("dept-1", "publish", new FormData())).rejects.toThrow(
      "REDIRECT:/admin/departments/dept-1?workflowError=",
    );
    expect(prisma.department.update).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      expect.stringContaining("/admin/departments/dept-1?workflowError="),
    );
  });
});
