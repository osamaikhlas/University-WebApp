import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { getReviewPeriodSettingsDetail } from "@/lib/admin/review-settings";
import { Container } from "@/components/ui/Container";
import { PageHeading } from "@/components/ui/PageHeading";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { updateReviewPeriodAction } from "@/app/admin/content-review-settings/actions";

export const metadata: Metadata = { title: "Review Period Settings" };
export const dynamic = "force-dynamic";

export default async function ContentReviewSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("compliance:verify");
  const { error } = await searchParams;
  const settings = await getReviewPeriodSettingsDetail();

  return (
    <Container>
      <div className="flex flex-col gap-6 py-10">
        <PageHeading
          title="Review Period Settings"
          description="How often each module's published content must be reconfirmed as still accurate. Changing a period immediately affects every record's overdue status — no re-review is required just to apply a new period."
        />

        {error ? <Alert tone="danger">{error}</Alert> : null}

        <div className="flex flex-col gap-4">
          {settings.map((setting) => (
            <Card key={setting.moduleKey} data-review-setting={setting.moduleKey}>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold">{setting.label}</h2>
                  <p className="mt-1 text-xs text-foreground/60">
                    {setting.isOverride
                      ? `Custom period — last changed ${setting.updatedAt?.toLocaleDateString()}${
                          setting.updatedByName ? ` by ${setting.updatedByName}` : ""
                        }.`
                      : "Using the system default (no override set)."}
                  </p>
                </div>

                <form action={updateReviewPeriodAction} className="flex items-end gap-2">
                  <input type="hidden" name="moduleKey" value={setting.moduleKey} />
                  <div>
                    <label
                      htmlFor={`period-${setting.moduleKey}`}
                      className="block text-xs font-medium text-foreground/70"
                    >
                      Review period (days)
                    </label>
                    <input
                      id={`period-${setting.moduleKey}`}
                      name="periodDays"
                      type="number"
                      defaultValue={setting.periodDays}
                      className="mt-1 w-28 rounded-md border border-border-subtle bg-surface px-2 py-1 text-sm"
                    />
                  </div>
                  <Button type="submit" variant="secondary">
                    Save
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Container>
  );
}
