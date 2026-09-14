import { expect, test, type Page } from "@playwright/test";

/**
 * Full CMS lifecycle for the Results module — the first e2e coverage of the
 * `content_examinations` domain (EXAMINATION_OFFICER manages, REVIEWER/PRINCIPAL publish)
 * and, more importantly, of Result's double publish gate: a result only reaches the public
 * /results page once it is BOTH `status: PUBLISHED` AND `isPublic: true` — two independent
 * flags neither of which implies the other (src/lib/content.ts's getResults). Exercised
 * against the real dev server + seeded database.
 */
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

async function loginAs(page: Page, roleSlug: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${roleSlug}@example.invalid`);
  await page.getByLabel("Password").fill(DEV_LOGIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe.serial("Results CMS module (content_examinations domain, double publish gate)", () => {
  const externalLink = `https://example.invalid/e2e-result-${Date.now()}`;
  let resultUrl = "";

  test("EXAMINATION_OFFICER can create a result, not publicly visible by default", async ({ page }) => {
    await loginAs(page, "examination-officer");
    await page.goto("/admin/results/new");

    await page.locator("#programId").selectOption({ index: 1 });
    await page.locator("#examinationId").selectOption({ index: 1 });
    await page.locator("#externalLink").fill(externalLink);
    // Leave the "Publicly visible" checkbox unchecked deliberately.
    await page.getByRole("button", { name: /create result/i }).click();

    await page.waitForURL((url) => !url.pathname.endsWith("/new"));
    resultUrl = page.url();

    await expect(page.getByText("Draft")).toBeVisible();
    await expect(page.getByText("No", { exact: true })).toBeVisible();
  });

  test("EXAMINATION_OFFICER can submit for review, then REVIEWER approves and publishes", async ({
    page,
  }) => {
    await loginAs(page, "examination-officer");
    await page.goto(resultUrl);
    await page.getByRole("button", { name: /submit for review/i }).click();
    await expect(page.getByText("Pending review")).toBeVisible({ timeout: 15_000 });
  });

  test("REVIEWER approves and publishes", async ({ page }) => {
    await loginAs(page, "reviewer");
    await page.goto(resultUrl);
    await page.getByRole("button", { name: /^approve$/i }).click();
    await expect(page.getByText("Approved")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /^publish$/i }).click();
    await expect(page.getByText("Published")).toBeVisible({ timeout: 15_000 });
  });

  test("PUBLISHED but not marked public: still absent from the public Results page", async ({ page }) => {
    await page.goto("/results");
    await expect(page.locator(`a[href="${externalLink}"]`)).toHaveCount(0);
  });

  test("EXAMINATION_OFFICER marks it publicly visible (editing a PUBLISHED record doesn't revert status)", async ({
    page,
  }) => {
    await loginAs(page, "examination-officer");
    await page.goto(`${resultUrl}/edit`);
    await page.locator("#isPublic").check();
    await page.getByRole("button", { name: /save changes/i }).click();

    await expect(page.getByText("Yes", { exact: true })).toBeVisible();
    await expect(page.getByText("Published")).toBeVisible();
  });

  test("now both PUBLISHED and public: appears on the public Results page", async ({ page }) => {
    await page.goto("/results");
    await expect(page.locator(`a[href="${externalLink}"]`)).toBeVisible();
  });
});

test.describe("Results is scoped to content_examinations, not content_admissions", () => {
  test("ADMISSION_OFFICER (wrong domain) cannot create a result", async ({ page }) => {
    await loginAs(page, "admission-officer");
    await page.goto("/admin/results/new");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });
});
