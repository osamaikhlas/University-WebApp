import type { ReactNode } from "react";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pub-root flex min-h-full flex-1 flex-col bg-[var(--pub-cream)] text-[var(--pub-ink)]">
      <PublicHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
