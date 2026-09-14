import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { getPolicies, getRegulations } from "@/lib/content";

// Always render per-request: this page reads live, publish-gated content from the
// database (CLAUDE.md rule 4), so a stale statically-prerendered build must never be
// served here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rules & Regulations",
};

export default async function RulesPage() {
  const [policies, regulations] = await Promise.all([getPolicies(), getRegulations()]);
  const anyPlaceholder = [...policies, ...regulations].some((row) => row.isPlaceholder);

  return (
    <PublicPageShell
      title="Rules & Regulations"
      description="Institutional policies and regulations."
      breadcrumbLabel="Rules & Regulations"
    >
      <div className="flex flex-col gap-10">
        {anyPlaceholder ? <DemoDataNotice /> : null}

        <section aria-labelledby="policies-heading" className="flex flex-col gap-3">
          <h2 id="policies-heading" className="text-lg font-semibold">
            Policies
          </h2>
          {policies.length === 0 ? (
            <EmptyState title="No policies have been published yet." />
          ) : (
            <ul className="flex flex-col gap-3">
              {policies.map((policy) => (
                <li key={policy.id}>
                  <Card>
                    <h3 className="text-sm font-semibold">{policy.title}</h3>
                    {policy.body ? (
                      <p className="mt-2 text-sm text-foreground/70">{policy.body}</p>
                    ) : null}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="regulations-heading" className="flex flex-col gap-3">
          <h2 id="regulations-heading" className="text-lg font-semibold">
            Regulations
          </h2>
          {regulations.length === 0 ? (
            <EmptyState title="No regulations have been published yet." />
          ) : (
            <ul className="flex flex-col gap-3">
              {regulations.map((regulation) => (
                <li key={regulation.id}>
                  <Card>
                    <h3 className="text-sm font-semibold">{regulation.title}</h3>
                    {regulation.body ? (
                      <p className="mt-2 text-sm text-foreground/70">{regulation.body}</p>
                    ) : null}
                    {regulation.regulatingBody ? (
                      <p className="mt-2 text-xs text-foreground/60">
                        Regulating body: {regulation.regulatingBody}
                      </p>
                    ) : null}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PublicPageShell>
  );
}
