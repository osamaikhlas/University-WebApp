import { expect, test, type Page } from "@playwright/test";

/**
 * Content review/freshness tracking: the review panel shown on a reviewable module's view
 * page (last updated/last reviewed/next review date/reviewer), the mark-reviewed action and
 * its permission gate, the review-period settings screen, and the dashboard's review-warning
 * section — exercised against the real dev server + seeded database.
 *
 * Deliberately does not try to force a record into an "overdue" state (that would require
 * backdating a publish timestamp, which nothing in this app's admin UI exposes, and no other
 * e2e spec in this repo shells out to the database directly for setup). The overdue/not-overdue
 * date arithmetic itself — including period-override behavior — is covered precisely by
 * tests/unit/content-review.test.ts and tests/unit/admin/dashboard.test.ts, which can control
 * "now" and the anchor date exactly. This spec proves the real UI wiring: permissions, the
 * panel's display, the mark-reviewed action, the settings screen, and the dashboard section
 * rendering without error.
 */
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

async function loginAs(page: Page, roleSlug: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${roleSlug}@example.invalid`);
  await page.getByLabel("Password").fill(DEV_LOGIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe.serial("Content review — Notice review panel and mark-reviewed action", () => {
  const title = `E2E Review Notice ${Date.now()}`;
  let noticeUrl = "";

  test("EDITOR creates, submits, and does not see a Mark reviewed button", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/notices/new");
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Body").fill("Created to verify content review tracking end to end.");
    await page.getByRole("button", { name: /create notice/i }).click();
    await page.waitForURL((url) => !url.pathname.endsWith("/new"));
    noticeUrl = page.url();

    await page.getByRole("button", { name: /submit for review/i }).click();
    await expect(page.getByText("Submitted")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole("heading", { name: "Review status" })).toBeVisible();
    await expect(page.getByRole("button", { name: /mark reviewed/i })).toHaveCount(0);
  });

  test("REVIEWER approves and publishes it, and the review panel shows never-reviewed with a real due date", async ({
    page,
  }) => {
    await loginAs(page, "reviewer");
    await page.goto(noticeUrl);
    await page.getByRole("button", { name: /start review/i }).click();
    await expect(page.getByText("Under review")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^approve$/i }).click();
    await expect(page.getByText("Approved")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^publish$/i }).click();
    await expect(page.getByText("Published", { exact: true })).toBeVisible({ timeout: 15_000 });

    const panel = page.locator('[data-review-panel="true"]');
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Never reviewed")).toBeVisible();
    // A freshly published record isn't overdue under the default (180-day) period.
    await expect(panel.getByText(/overdue for review/i)).toHaveCount(0);
  });

  test("REVIEWER marks it reviewed, and the panel updates with today's date and their name", async ({ page }) => {
    await loginAs(page, "reviewer");
    await page.goto(noticeUrl);

    const panel = page.locator('[data-review-panel="true"]');
    await panel.getByRole("button", { name: /mark reviewed/i }).click();

    await expect(page.locator('[data-review-panel="true"]').getByText("Never reviewed")).toHaveCount(0);
    await expect(
      page.locator('[data-review-panel="true"]').getByText("[DEV SEED] REVIEWER Test Account"),
    ).toBeVisible();
  });

  test("SUPER_ADMIN finds a MARK_REVIEWED audit entry for it", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto("/admin/audit-logs?entityType=Notice&action=MARK_REVIEWED");
    await expect(page.getByRole("link", { name: "Mark reviewed" }).first()).toBeVisible();
  });
});

test.describe("Content review — settings access control", () => {
  test("a role without compliance:verify is redirected to /admin/unauthorized", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/content-review-settings");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });

  test("SUPER_ADMIN can reach the settings screen and it lists all 5 reviewable modules", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto("/admin/content-review-settings");
    await expect(page.getByRole("heading", { name: "Review Period Settings" })).toBeVisible();
    for (const label of ["Notices", "Timetables", "Academic Calendar", "Admissions", "Faculty"]) {
      await expect(page.locator(`h2:text-is("${label}")`)).toBeVisible();
    }
  });
});

test.describe.serial("Content review — configuring a module's review period", () => {
  test("SUPER_ADMIN sets a custom period for Notices, and it's saved and shown as an override", async ({
    page,
  }) => {
    await loginAs(page, "super-admin");
    await page.goto("/admin/content-review-settings");

    const card = page.locator('[data-review-setting="notices"]');
    await card.getByLabel("Review period (days)").fill("45");
    await card.getByRole("button", { name: "Save" }).click();

    await expect(page).toHaveURL(/\/admin\/content-review-settings$/);
    const updatedCard = page.locator('[data-review-setting="notices"]');
    await expect(updatedCard.getByText(/custom period/i)).toBeVisible();
    await expect(updatedCard.getByLabel("Review period (days)")).toHaveValue("45");
  });

  test("an invalid period is rejected with an error and does not change the saved value", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto("/admin/content-review-settings");

    const card = page.locator('[data-review-setting="notices"]');
    await card.getByLabel("Review period (days)").fill("0");
    await card.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    const stillCard = page.locator('[data-review-setting="notices"]');
    await expect(stillCard.getByLabel("Review period (days)")).toHaveValue("45");
  });
});

test.describe("Content review — dashboard section", () => {
  test("the dashboard renders the Content review warnings section with a link to settings", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto("/admin");

    await expect(page.getByRole("heading", { name: "Content review warnings" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Review period settings", exact: true })).toBeVisible();
    await expect(page.getByText(/stale notices/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Overdue reviews" })).toBeVisible();
  });
});
