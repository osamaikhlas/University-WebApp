import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import { getPrograms } from "@/lib/content";

const PREVIEW_COUNT = 6;

export async function ProgramsSection() {
  const programs = (await getPrograms()).slice(0, PREVIEW_COUNT);

  return (
    <section aria-labelledby="programs-heading" className="flex flex-col gap-3">
      <HomeSectionHeader id="programs-heading" title="Academic programs" viewAllHref="/academics" />
      {programs.some((p) => p.isPlaceholder) ? <DemoDataNotice /> : null}
      {programs.length === 0 ? (
        <EmptyState title="No academic programs have been published yet." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {programs.map((program) => (
            <li key={program.id}>
              <Card className="p-4">
                <p className="text-sm font-medium">{program.name}</p>
                <p className="mt-1 text-xs text-foreground/60">
                  {program.department.name} · {program.level.replace(/_/g, " ")} ·{" "}
                  {program.durationYears} yr{program.durationYears === 1 ? "" : "s"}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
