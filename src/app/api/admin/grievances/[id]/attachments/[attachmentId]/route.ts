import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { readGrievanceAttachment } from "@/lib/security/file-storage";

export const dynamic = "force-dynamic";

/**
 * The only way a grievance attachment's bytes are ever served — gated behind
 * `grievances:view` (CLAUDE.md rules 5, 6: private grievance data, including its
 * attachments, must never be reachable through a public URL). `requirePermission` redirects
 * unauthenticated/unauthorized callers rather than returning JSON, matching every other admin
 * page's behavior in this app.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  await requirePermission("grievances:view");
  const { id, attachmentId } = await params;

  const attachment = await prisma.grievanceAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment || attachment.grievanceId !== id) {
    return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
  }

  const bytes = await readGrievanceAttachment(attachment.storedPath);

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": attachment.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
      "Content-Length": String(attachment.sizeBytes),
      "Cache-Control": "private, no-store",
    },
  });
}
