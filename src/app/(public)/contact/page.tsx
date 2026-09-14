import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { getContacts, getLocation } from "@/lib/content";

// Always render per-request: this page reads live, publish-gated content from the
// database (CLAUDE.md rule 4), so a stale statically-prerendered build must never be
// served here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact",
};

export default async function ContactPage() {
  const [contacts, location] = await Promise.all([getContacts(), getLocation()]);
  const anyPlaceholder = contacts.some((row) => row.isPlaceholder) || location?.isPlaceholder;

  return (
    <PublicPageShell title="Contact" description="How to reach the college.">
      <div className="flex flex-col gap-6">
        {anyPlaceholder ? <DemoDataNotice /> : null}

        {contacts.length === 0 ? (
          <EmptyState title="No contact details have been published yet." />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {contacts.map((contact) => (
              <li key={contact.id}>
                <Card className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                    {contact.label ?? contact.type}
                  </p>
                  <p className="mt-1 text-sm font-medium">{contact.value}</p>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {location ? (
          <Card>
            <h2 className="text-sm font-medium text-foreground/70">Address</h2>
            <p className="mt-1 text-sm text-foreground">{location.address}</p>
          </Card>
        ) : null}
      </div>
    </PublicPageShell>
  );
}
