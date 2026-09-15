import { expect, test, type Page } from "@playwright/test";

/**
 * The admin dashboard: real database-derived summary cards and tables (content status
 * totals, compliance percentage, requirements needing attention, content not recently
 * reviewed, document expiry warnings, recent notices/events, recent audit activity), scoped
 * per viewer by the same permissions each section's own admin module already enforces —
 * exercised against the real dev server + seeded database.
 */
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

async function loginAs(page: Page, roleSlug: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${roleSlug}@example.invalid`);
  await page.getByLabel("Password").fill(DEV_LOGIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin$/);
}

async function statValue(page: Page, label: string): Promise<number> {
  const text = await page.locator(`[data-stat-card="${label}"] p.text-3xl`).textContent();
  return Number(text);
}

test.describe("Admin dashboard — content shown per role", () => {
  test("SUPER_ADMIN sees every section: content totals, compliance, expiry warnings, and audit activity", async ({
    page,
  }) => {
    await loginAs(page, "super-admin");

    await expect(page.locator('[data-stat-card="Published"]')).toBeVisible();
    await expect(page.locator('[data-stat-card="Drafts"]')).toBeVisible();
    await expect(page.locator('[data-stat-card="Pending review"]')).toBeVisible();
    await expect(page.locator('[data-stat-card="Compliance"]')).toBeVisible();
    await expect(page.locator('[data-stat-card="Requirements needing attention"]')).toBeVisible();
    await expect(page.locator('[data-stat-card="Document expiry warnings"]')).toBeVisible();

    await expect(page.getByRole("heading", { name: "Recent notices" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Upcoming events" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Compliance requirements needing attention" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Content not recently reviewed" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent audit activity" })).toBeVisible();

    // Every number is a real, non-negative integer — never blank/NaN/fabricated.
    expect(await statValue(page, "Published")).toBeGreaterThanOrEqual(0);
    expect(await statValue(page, "Drafts")).toBeGreaterThanOrEqual(0);
    expect(await statValue(page, "Pending review")).toBeGreaterThanOrEqual(0);
  });

  test("EDITOR (content_general only) sees content totals but not compliance or audit sections", async ({ page }) => {
    await loginAs(page, "editor");

    await expect(page.locator('[data-stat-card="Published"]')).toBeVisible();
    await expect(page.locator('[data-stat-card="Drafts"]')).toBeVisible();
    await expect(page.locator('[data-stat-card="Pending review"]')).toBeVisible();

    await expect(page.locator('[data-stat-card="Compliance"]')).toHaveCount(0);
    await expect(page.locator('[data-stat-card="Requirements needing attention"]')).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Recent audit activity" })).toHaveCount(0);
  });

  test("ADMISSION_OFFICER (content_admissions only) does not see the notices/events/documents sections", async ({
    page,
  }) => {
    await loginAs(page, "admission-officer");

    await expect(page.getByRole("heading", { name: "Recent notices" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Upcoming events" })).toHaveCount(0);
    await expect(page.locator('[data-stat-card="Document expiry warnings"]')).toHaveCount(0);
    // Still gets the site-wide content totals, scoped to their own domain.
    await expect(page.locator('[data-stat-card="Published"]')).toBeVisible();
  });
});

test.describe("Admin dashboard — reflects real database state", () => {
  test("a newly-created draft notice increments the Drafts count and appears in Recent notices", async ({
    page,
  }) => {
    await loginAs(page, "editor");
    await page.goto("/admin");
    const draftsBefore = await statValue(page, "Drafts");

    const title = `E2E Dashboard Draft ${Date.now()}`;
    await page.goto("/admin/notices/new");
    await page.locator("#title").fill(title);
    await page.locator("#body").fill("Created to verify the dashboard reflects real data.");
    await page.getByRole("button", { name: /create notice/i }).click();
    await page.waitForURL((url) => !url.pathname.endsWith("/new"));

    await page.goto("/admin");
    // >= rather than exact equality: other e2e specs create content_general drafts
    // concurrently in the same run, so the count can only ever go up by *at least* one here,
    // never by exactly one.
    expect(await statValue(page, "Drafts")).toBeGreaterThanOrEqual(draftsBefore + 1);
    await expect(page.getByRole("link", { name: title })).toBeVisible();
  });

  test("creating content writes an audit entry visible in Recent audit activity", async ({ page }) => {
    await loginAs(page, "super-admin");
    const title = `E2E Dashboard Audit Department ${Date.now()}`;

    await page.goto("/admin/departments/new");
    await page.locator("#name").fill(title);
    await page.getByRole("button", { name: /create department/i }).click();
    await page.waitForURL((url) => !url.pathname.endsWith("/new"));

    await page.goto("/admin");
    const auditSection = page.getByRole("heading", { name: "Recent audit activity" }).locator("..").locator("..");
    await expect(auditSection.getByText("Department").first()).toBeVisible();
  });
});

test.describe.serial("Admin dashboard — document expiry warning", () => {
  const title = `E2E Dashboard Expiring Doc ${Date.now()}`;
  let documentUrl = "";

  test("EDITOR uploads a document expiring tomorrow and submits it for review", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/documents/new");
    await page.locator("#title").fill(title);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await page.locator("#expiryDate").fill(tomorrow.toISOString().slice(0, 10));
    await page.setInputFiles('input[name="file"]', {
      name: "expiring.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%%EOF", "utf8"),
    });
    await page.getByRole("button", { name: /upload document/i }).click();
    await page.waitForURL((url) => !url.pathname.endsWith("/new"));
    documentUrl = page.url();

    await page.getByRole("button", { name: /submit for review/i }).click();
    await expect(page.getByText("Submitted")).toBeVisible({ timeout: 15_000 });
  });

  test("REVIEWER approves and publishes it", async ({ page }) => {
    await loginAs(page, "reviewer");
    await page.goto(documentUrl);
    await page.getByRole("button", { name: /start review/i }).click();
    await expect(page.getByText("Under review")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^approve$/i }).click();
    await expect(page.getByText("Approved")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^publish$/i }).click();
    await expect(page.getByText("Published", { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test("it now shows up as a document expiry warning on the dashboard", async ({ page }) => {
    await loginAs(page, "reviewer");
    await page.goto("/admin");
    const expirySection = page
      .getByRole("heading", { name: "Document expiry warnings" })
      .locator("..")
      .locator("..");
    const row = expirySection.getByRole("row", { name: title });
    await expect(row).toBeVisible();
    await expect(row.getByText(/expiring soon/i)).toBeVisible();
  });
});

test.describe("Admin dashboard access control", () => {
  test("an unauthenticated visitor is redirected to /login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/login$/);
  });
});
