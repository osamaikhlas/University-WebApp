import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import { getDepartments } from "@/lib/content";

const PREVIEW_COUNT = 6;

export async function DepartmentsSection() {
  const departments = (await getDepartments()).slice(0, PREVIEW_COUNT);

  return (
    <section aria-labelledby="departments-heading" className="flex flex-col gap-3">
      <HomeSectionHeader
        id="departments-heading"
        title="Departments"
        viewAllHref="/academics"
      />
      {departments.some((d) => d.isPlaceholder) ? <DemoDataNotice /> : null}
      {departments.length === 0 ? (
        <EmptyState title="No departments have been published yet." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {departments.map((department) => (
            <li key={department.id}>
              <Card className="p-4">
                <p className="text-sm font-medium">{department.name}</p>
                {department.description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-foreground/60">
                    {department.description}
                  </p>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
