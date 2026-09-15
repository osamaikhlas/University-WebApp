import { expect, test, type Page } from "@playwright/test";

/**
 * Full CMS lifecycle for the Notices module (content_general domain, the first module with
 * date fields), exercised across real roles against the real dev server + seeded database.
 *
 * Every wait here is content-based, never `waitForURL` — a transition Server Action always
 * redirects back to the exact URL it started from, so `waitForURL(sameUrl)` resolves
 * instantly without ever actually waiting for the mutation (a real bug found and fixed in
 * the Departments/Faculty CMS specs; see progress.md's 2026-09-14 decisions log).
 */
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

async function loginAs(page: Page, roleSlug: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${roleSlug}@example.invalid`);
  await page.getByLabel("Password").fill(DEV_LOGIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe.serial("Notices CMS module — full workflow across roles", () => {
  const noticeTitle = `E2E Test Notice ${Date.now()}`;
  let noticeUrl = "";

  test("EDITOR can create a notice with dates, which starts as a draft", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/notices/new");

    await page.getByLabel("Title").fill(noticeTitle);
    await page.getByLabel("Body").fill("Body text created by an e2e test.");
    await page.getByLabel(/publish date/i).fill("2026-01-01");
    await page.getByRole("button", { name: /create notice/i }).click();

    // Wait for content only on the real view page, never the "new" form.
    await expect(page.getByText("Body text created by an e2e test.")).toBeVisible();
    noticeUrl = page.url();

    await expect(page.getByText("Draft")).toBeVisible();
    await expect(page.getByRole("button", { name: /submit for review/i })).toBeVisible();
  });

  test("EDITOR can submit the notice for review", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto(noticeUrl);
    await page.getByRole("button", { name: /submit for review/i }).click();

    await expect(page.getByText("Submitted")).toBeVisible({ timeout: 15_000 });
  });

  test("REVIEWER can start review, approve, and publish the notice", async ({ page }) => {
    await loginAs(page, "reviewer");
    await page.goto(noticeUrl);
    await page.getByRole("button", { name: /start review/i }).click();
    await expect(page.getByText("Under review")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /^approve$/i }).click();
    await expect(page.getByText("Approved")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /^publish$/i }).click();
    await expect(page.getByText("Published")).toBeVisible({ timeout: 15_000 });
  });

  test("the published notice is now visible on the public Notices page", async ({ page }) => {
    await page.goto("/notices");
    await expect(page.getByText(noticeTitle)).toBeVisible();
  });

  test("ADMINISTRATOR can view notices but cannot create or edit", async ({ page }) => {
    await loginAs(page, "administrator");
    await page.goto("/admin/notices");
    await expect(page.getByRole("link", { name: /new notice/i })).toHaveCount(0);

    await page.goto(noticeUrl);
    await expect(page.getByRole("link", { name: /^edit$/i })).toHaveCount(0);
  });

  test("REVIEWER can flag the published notice as needing an update, with a reason", async ({
    page,
  }) => {
    await loginAs(page, "reviewer");
    await page.goto(noticeUrl);
    await page.getByLabel(/comment.*reason/i).fill("Publish date needs to be corrected.");
    await page.getByRole("button", { name: /request update/i }).click();

    await expect(page.getByText("Update required")).toBeVisible({ timeout: 15_000 });
  });

  test("the update-request reason is surfaced on the notice's own page, not just the audit log", async ({
    page,
  }) => {
    await loginAs(page, "editor");
    await page.goto(noticeUrl);

    await expect(page.getByText("Update requested")).toBeVisible();
    await expect(page.getByText(/Publish date needs to be corrected\./)).toBeVisible();
  });
});

test.describe("FACULTY_EDITOR is scoped to content_faculty, not content_general", () => {
  test("cannot create a notice", async ({ page }) => {
    await loginAs(page, "faculty-editor");
    await page.goto("/admin/notices/new");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });
});
