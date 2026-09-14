import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import { getContacts } from "@/lib/content";

const PREVIEW_COUNT = 4;

export async function ContactSection() {
  const contacts = (await getContacts()).slice(0, PREVIEW_COUNT);

  return (
    <section aria-labelledby="contact-heading" className="flex flex-col gap-3">
      <HomeSectionHeader id="contact-heading" title="Contact" viewAllHref="/contact" />
      {contacts.some((c) => c.isPlaceholder) ? <DemoDataNotice /> : null}
      {contacts.length === 0 ? (
        <EmptyState title="No contact details have been published yet." />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-border-subtle">
            {contacts.map((contact) => (
              <li key={contact.id} className="p-4 text-sm">
                <span className="font-medium">{contact.label ?? contact.type}: </span>
                <span className="text-foreground/70">{contact.value}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
