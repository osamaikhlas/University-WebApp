import type { ReactNode } from "react";
import { AdminNoAuthBanner } from "@/components/layout/AdminNoAuthBanner";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export const metadata = {
  title: {
    default: "Admin",
    template: "%s | Admin",
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <AdminNoAuthBanner />
      <div className="flex flex-1 flex-col lg:flex-row">
        <AdminSidebar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
