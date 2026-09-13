export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-sm text-foreground/60">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-border-subtle border-t-brand"
          aria-hidden="true"
        />
        <span>Loading…</span>
      </div>
    </div>
  );
}
