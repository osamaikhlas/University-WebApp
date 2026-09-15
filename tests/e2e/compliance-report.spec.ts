import { expect, test, type Page } from "@playwright/test";

/**
 * Compliance report generation + submission tracking (docs/compliance-matrix.md §2,
 * docs/database-design.md §9) — the circular's explicit "compliance report + live URL
 * submitted to the Office of the Inspector of Colleges" requirement. Each report is a
 * frozen, append-style artifact (a college can generate several before marking one
 * submitted), so this suite creates fresh rows per run rather than needing to normalize
 * shared state the way tests/e2e/cms-compliance.spec.ts does for the fixed 20 requirements.
 */
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

async function loginAs(page: Page, roleSlug: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${roleSlug}@example.invalid`);
  await page.getByLabel("Password").fill(DEV_LOGIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe("Compliance report generation and submission", () => {
  test("ADMINISTRATOR (compliance:verify) can generate a report, then mark it submitted", async ({
    page,
  }) => {
    await loginAs(page, "administrator");
    await page.goto("/admin/compliance/reports");
    await expect(page.getByRole("heading", { name: "Compliance reports" })).toBeVisible();

    const websiteUrl = `https://e2e-${Date.now()}.example-college.edu.pk`;
    await page.getByLabel("Live website URL").fill(websiteUrl);
    await page.getByRole("button", { name: /generate report/i }).click();

    await expect(page.getByRole("link", { name: websiteUrl })).toBeVisible({ timeout: 15_000 });

    const row = page.getByRole("row").filter({ hasText: websiteUrl });
    await expect(row.getByText(/^\d+ \/ \d+$/)).toBeVisible();

    await row.getByRole("button", { name: /mark as submitted/i }).click();
    await expect(
      page.getByRole("row").filter({ hasText: websiteUrl }).getByText(/by /),
    ).toBeVisible({
      timeout: 15_000,
    });
    // Submitted reports no longer offer a "Mark as submitted" button (one-way action).
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: websiteUrl })
        .getByRole("button", { name: /mark as submitted/i }),
    ).toHaveCount(0);
  });

  test("EDITOR (no compliance permission) is redirected to /admin/unauthorized", async ({
    page,
  }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/compliance/reports");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });

  // Note: per docs/permission-matrix.md, `compliance:view` and `compliance:verify` are
  // granted to exactly the same roles (SUPER_ADMIN/PRINCIPAL/ADMINISTRATOR) — no seeded
  // dev account currently holds `compliance:view` without `compliance:verify`, so the
  // page's "list visible, generate form hidden" branch (gated by `canVerify` in
  // src/app/admin/compliance/reports/page.tsx) has no role to exercise it end-to-end today.
});
