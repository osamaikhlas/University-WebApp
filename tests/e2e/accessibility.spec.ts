import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Automated WCAG 2.1 A/AA scans (axe-core) across a representative sample of public and
 * admin pages — one of each page "shape" (list, create form, edit/view form with a
 * workflow, detail view, dashboard) rather than every one of the ~60 routes, since pages
 * of the same shape share the same layout/component code and would just repeat the same
 * findings. This is a supplement to, not a replacement for, the manual audit (keyboard
 * nav, focus management, and anything axe can't verify like whether alt text is
 * *meaningful* rather than merely present).
 */
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

async function loginAs(page: Page, roleSlug: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${roleSlug}@example.invalid`);
  await page.getByLabel("Password").fill(DEV_LOGIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin$/);
}

async function expectNoViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)\n  ${v.nodes.map((n) => n.target.join(" ")).join("\n  ")}`,
  );
  expect(summary, summary.join("\n\n")).toEqual([]);
}

test.describe("Accessibility — public pages", () => {
  for (const path of [
    "/",
    "/about",
    "/notices",
    "/events",
    "/faculty",
    "/gallery",
    "/search",
    "/contact",
    "/grievance",
    "/login",
  ]) {
    test(`${path} has no automatically detectable WCAG 2.1 A/AA violations`, async ({ page }) => {
      await page.goto(path);
      await expectNoViolations(page);
    });
  }
});

test.describe("Accessibility — admin pages", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "super-admin");
  });

  for (const path of [
    "/admin",
    "/admin/notices",
    "/admin/notices/new",
    "/admin/users",
    "/admin/audit-logs",
    "/admin/content-review-settings",
    "/admin/grievances",
    "/admin/compliance",
  ]) {
    test(`${path} has no automatically detectable WCAG 2.1 A/AA violations`, async ({ page }) => {
      await page.goto(path);
      await expectNoViolations(page);
    });
  }

  test("a notice's view page (workflow actions + review panel) has no violations", async ({ page }) => {
    await page.goto("/admin/notices");
    const firstRow = page.getByRole("row").nth(1);
    await firstRow.getByRole("link").first().click();
    await page.waitForURL(/\/admin\/notices\/[^/]+$/);
    await expectNoViolations(page);
  });

  // These modules' detail pages each had a `<dl>` containing a `<div>` that wrapped further
  // `<div>`s around `<dt>`/`<dd>` pairs — invalid per the HTML definition-list content model
  // and flagged by axe's definition-list/dlitem rules. Fixed by flattening to `<dt>`/`<dd>`
  // as direct grid children (see e.g. src/app/admin/notices/[id]/page.tsx). Verifying the
  // fix directly on each affected module's real detail page, not just the shared pattern.
  for (const listPath of [
    "/admin/academic-calendar",
    "/admin/admissions",
    "/admin/affiliation",
    "/admin/compliance",
    "/admin/documents",
    "/admin/enrollment-statistics",
    "/admin/events",
    "/admin/exams",
    "/admin/fee-structures",
    "/admin/results",
    "/admin/seminars",
    "/admin/workshops",
  ]) {
    test(`${listPath}'s detail page has no violations`, async ({ page }) => {
      await page.goto(listPath);
      const firstRow = page.getByRole("row").nth(1);
      await firstRow.getByRole("link").first().click();
      await page.waitForURL((url) => url.pathname !== listPath && url.pathname.startsWith(listPath));
      await expectNoViolations(page);
    });
  }

  test("an audit log entry's detail page has no violations", async ({ page }) => {
    await page.goto("/admin/audit-logs");
    const firstRow = page.getByRole("row").nth(1);
    await firstRow.getByRole("link").first().click();
    await page.waitForURL(/\/admin\/audit-logs\/[^/]+$/);
    await expectNoViolations(page);
  });

  for (const path of ["/admin/college-profile", "/admin/location"]) {
    test(`${path} (single-record detail page) has no violations`, async ({ page }) => {
      await page.goto(path);
      await expectNoViolations(page);
    });
  }
});
