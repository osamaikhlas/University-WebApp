import { expect, test, type Page } from "@playwright/test";

const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

async function loginAs(page: Page, roleSlug: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${roleSlug}@example.invalid`);
  await page.getByLabel("Password").fill(DEV_LOGIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe.serial("Timetables CMS module (required Program FK + optional JSON schedule)", () => {
  const classGroup = `E2E Test Section ${Date.now()}`;
  let timetableUrl = "";

  test("EDITOR can create a timetable with a program and a JSON schedule", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/timetables/new");

    // Direct #id locators here, not getByLabel — "Program" is ambiguous against the
    // sidebar's "Programs" nav link and similar labels elsewhere on the page.
    await page.locator("#programId").selectOption({ index: 1 });
    await page.locator("#classGroup").fill(classGroup);
    await page.locator("#effectiveFrom").fill("2026-09-01");
    await page
      .locator("#structuredSchedule")
      .fill('{"monday": [{"time": "09:00", "course": "SAMP-101"}]}');
    await page.getByRole("button", { name: /create timetable/i }).click();

    // Wait for the URL to actually leave "/new" (not just for content to appear — during a
    // Next.js client-side transition, the new page's DOM can attach slightly before
    // history/the address bar commits, so a content-only wait can read page.url() one tick
    // too early and capture the stale "/new" URL).
    await page.waitForURL((url) => !url.pathname.endsWith("/new"));
    timetableUrl = page.url();
    await expect(page.getByText("Draft")).toBeVisible();
    await expect(page.getByText(/"monday"/)).toBeVisible();
  });

  test("rejects malformed JSON on edit instead of silently discarding it", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto(`${timetableUrl}/edit`);
    const scheduleField = page.locator("#structuredSchedule");
    await scheduleField.fill("{not valid json");
    await page.getByRole("button", { name: /save changes/i }).click();

    await expect(page.getByText(/valid json/i)).toBeVisible();
    // Still on the edit form, not redirected — the bad input was rejected.
    await expect(page).toHaveURL(/\/edit$/);
  });

  test("EDITOR can submit for review", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto(timetableUrl);
    await page.getByRole("button", { name: /submit for review/i }).click();
    await expect(page.getByText("Submitted")).toBeVisible({ timeout: 15_000 });
  });

  // Separate test (fresh page/context) so navigating to /login isn't short-circuited by
  // an existing authenticated session redirecting straight back to /admin.
  test("REVIEWER starts review, approves, and publishes", async ({ page }) => {
    await loginAs(page, "reviewer");
    await page.goto(timetableUrl);
    await page.getByRole("button", { name: /start review/i }).click();
    await expect(page.getByText("Under review")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /^approve$/i }).click();
    await expect(page.getByText("Approved")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /^publish$/i }).click();
    await expect(page.getByText("Published")).toBeVisible({ timeout: 15_000 });
  });

  test("the published timetable is now visible on the public Academics page", async ({ page }) => {
    await page.goto("/academics");
    await expect(page.getByText(classGroup)).toBeVisible();
  });
});

test.describe("timetables require a real program", () => {
  test("ADMISSION_OFFICER (wrong domain) cannot create a timetable", async ({ page }) => {
    await loginAs(page, "admission-officer");
    await page.goto("/admin/timetables/new");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });
});
