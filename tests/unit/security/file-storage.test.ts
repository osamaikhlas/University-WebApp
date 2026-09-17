import { beforeEach, describe, expect, it, vi } from "vitest";

const { mkdirMock, writeFileMock, readFileMock } = vi.hoisted(() => ({
  mkdirMock: vi.fn(),
  writeFileMock: vi.fn(),
  readFileMock: vi.fn(),
}));

vi.mock("node:fs/promises", () => {
  const fns = { mkdir: mkdirMock, writeFile: writeFileMock, readFile: readFileMock };
  return { ...fns, default: fns };
});

import {
  AttachmentValidationError,
  readGrievanceAttachment,
  saveGrievanceAttachment,
} from "@/lib/security/file-storage";

function makeFile(name: string, content: string, type: string): File {
  return new File([content], name, { type });
}

beforeEach(() => {
  vi.clearAllMocks();
  mkdirMock.mockResolvedValue(undefined);
  writeFileMock.mockResolvedValue(undefined);
});

describe("saveGrievanceAttachment validation", () => {
  it("rejects an empty file", async () => {
    await expect(saveGrievanceAttachment("g1", makeFile("empty.pdf", "", "application/pdf"))).rejects.toThrow(
      AttachmentValidationError,
    );
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("rejects a file over the size cap", async () => {
    const big = new File([new Uint8Array(11 * 1024 * 1024)], "big.pdf", { type: "application/pdf" });
    await expect(saveGrievanceAttachment("g1", big)).rejects.toThrow(/10MB/);
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("rejects an unsupported mime type", async () => {
    await expect(
      saveGrievanceAttachment("g1", makeFile("script.exe", "content", "application/x-msdownload")),
    ).rejects.toThrow(/Unsupported attachment type/);
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("accepts a valid PDF and sanitizes the stored path", async () => {
    const pdfContent = "%PDF-1.4\n%%EOF";
    const result = await saveGrievanceAttachment(
      "g1",
      makeFile("my report (final)!!.pdf", pdfContent, "application/pdf"),
    );

    expect(writeFileMock).toHaveBeenCalled();
    expect(result.fileName).toBe("my report (final)!!.pdf");
    expect(result.storedPath).toMatch(/^g1[/\\][0-9a-f-]+-my_report__final___\.pdf$/);
    expect(result.mimeType).toBe("application/pdf");
    expect(result.sizeBytes).toBe(pdfContent.length);
  });

  it("rejects a file whose actual bytes don't match its declared type (content-sniffing spoof)", async () => {
    // Claims to be a PDF, but the bytes are plain HTML — the classic disguised-upload attack
    // this check exists to close (found during the 2026-09-15 security review).
    await expect(
      saveGrievanceAttachment(
        "g1",
        makeFile("report.pdf", "<html><script>alert(1)</script></html>", "application/pdf"),
      ),
    ).rejects.toThrow(/contents don't match/);
    expect(writeFileMock).not.toHaveBeenCalled();
  });
});

describe("readGrievanceAttachment", () => {
  it("reads back a previously stored relative path", async () => {
    readFileMock.mockResolvedValue(Buffer.from("hello"));
    const buffer = await readGrievanceAttachment("g1/fixed-uuid-report.pdf");
    expect(buffer.toString()).toBe("hello");
  });

  it("rejects a path that escapes the storage root", async () => {
    // Message now comes from the shared object-storage.ts backend (local disk/S3), not this
    // module directly — the containment check itself is unchanged.
    await expect(readGrievanceAttachment("../../etc/passwd")).rejects.toThrow(/Invalid storage key/);
    expect(readFileMock).not.toHaveBeenCalled();
  });
});
