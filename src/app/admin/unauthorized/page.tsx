import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";

export const metadata: Metadata = {
  title: "Unauthorized",
};

/**
 * Rendered whenever `requirePermission()` (src/lib/auth/guard.ts) finds an authenticated
 * user without the permission a route requires. This page itself requires no specific
 * permission — only that a session exists, which `src/app/admin/layout.tsx` already
 * enforces for every route under /admin.
 */
export default function UnauthorizedPage() {
  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading
          title="Access denied"
          description="Your account does not have permission to view that page."
        />
        <Card>
          <div className="flex flex-col gap-3">
            <Badge tone="neutral">403 — Forbidden</Badge>
            <p className="text-sm text-foreground/70">
              This action was blocked by a server-side permission check, not just hidden in
              the UI. If you believe you should have access, contact an administrator to
              review your assigned role.
            </p>
            <Link href="/admin" className="text-sm font-medium text-brand hover:underline">
              Return to the dashboard
            </Link>
          </div>
        </Card>
      </div>
    </Container>
  );
}
