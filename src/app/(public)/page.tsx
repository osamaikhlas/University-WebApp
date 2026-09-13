import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Home",
};

const QUICK_LINKS = [
  { href: "/programs", label: "Programs" },
  { href: "/admissions", label: "Admissions" },
  { href: "/notices", label: "Notices" },
  { href: "/faculty", label: "Faculty" },
  { href: "/grievance", label: "Grievance" },
  { href: "/contact", label: "Contact" },
];

export default function HomePage() {
  return (
    <Container>
      <div className="flex flex-col gap-8 py-12">
        <div className="flex flex-col gap-4">
          <Badge tone="placeholder">Development placeholder</Badge>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            [PLACEHOLDER] Affiliated College Portal
          </h1>
          <p className="max-w-2xl text-sm text-foreground/70 sm:text-base">
            This site is being built to satisfy Shah Abdul Latif University, Khairpur
            Circular No. I.C/SALU/KHP/-662 (04.09.2026), which requires every affiliated
            college to publish an official website containing 20 categories of institutional
            information. No real college content has been supplied yet — every section below
            is a placeholder until official records are provided (see{" "}
            <code className="font-mono">CLAUDE.md</code>).
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-medium text-foreground/70">Quick links</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {QUICK_LINKS.map((link) => (
              <Card key={link.href} className="p-4">
                <Link href={link.href} className="text-sm font-medium hover:underline">
                  {link.label}
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}
