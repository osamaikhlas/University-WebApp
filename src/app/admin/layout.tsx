import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/guard";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminUserBar } from "@/components/layout/AdminUserBar";

export const metadata = {
  title: {
    default: "Admin",
    template: "%s | Admin",
  },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Every /admin/* route requires at least a valid session — redirects to /login
  // otherwise. Individual pages layer their own `requirePermission()` check on top of
  // this for the specific module they render (CLAUDE.md rule 5).
  const user = await requireUser();

  return (
    <div className="flex flex-1 flex-col">
      <AdminUserBar user={user} />
      <div className="flex flex-1 flex-col lg:flex-row">
        <AdminSidebar permissions={user.permissions} />
        <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
