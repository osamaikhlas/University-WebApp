/**
 * Public-site-styled equivalent of src/components/DemoDataNotice.tsx — same meaning (this
 * section is showing isPlaceholder: true seed data, not verified official content;
 * CLAUDE.md rules 1/13/14), restyled to fit the editorial visual language instead of the
 * shared admin Alert component. Compact by design: it should read as a small provenance
 * note, not compete with the section's real content for attention.
 */
export function PublicDemoNotice({ className }: { className?: string }) {
  return (
    <p
      role="status"
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border border-[var(--pub-gold-500)]/40 bg-[var(--pub-gold-500)]/10 px-3 py-1 text-xs font-medium text-[var(--pub-gold-600)] ${className ?? ""}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--pub-gold-500)]" />
      Demo content — not verified official information
    </p>
  );
}
