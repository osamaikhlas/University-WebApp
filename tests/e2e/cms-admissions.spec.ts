import { expect, test, type Page } from "@playwright/test";

/**
 * Full CMS lifecycle for the Admissions module — the first e2e coverage of the
 * `content_admissions` domain (ADMISSION_OFFICER manages, REVIEWER/PRINCIPAL publish),
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

test.describe.serial("Admissions CMS module (content_admissions domain)", () => {
  const academicYear = `E2E ${Date.now()}`;
  let admissionUrl = "";

  test("ADMISSION_OFFICER can create an admission cycle, which starts as a draft", async ({ page }) => {
    await loginAs(page, "admission-officer");
    await page.goto("/admin/admissions/new");

    await page.locator("#programId").selectOption({ index: 1 });
    await page.locator("#academicYear").fill(academicYear);
    await page.locator("#eligibilityCriteria").fill("Minimum 60% in intermediate.");
    await page.getByRole("button", { name: /create admission cycle/i }).click();

    // The create Server Action redirects from /new to the real record's URL — wait for
    // that URL change explicitly, not just for content, since during a Next.js
    // client-side transition the DOM can attach a tick before the address bar commits
    // (see cms-timetables.spec.ts's decisions-log entry for the full story).
    await page.waitForURL((url) => !url.pathname.endsWith("/new"));
    admissionUrl = page.url();

    await expect(page.getByText("Draft")).toBeVisible();
    await expect(page.getByText("Minimum 60% in intermediate.")).toBeVisible();
  });

  test("ADMISSION_OFFICER can submit for review", async ({ page }) => {
    await loginAs(page, "admission-officer");
    await page.goto(admissionUrl);
    await page.getByRole("button", { name: /submit for review/i }).click();
    await expect(page.getByText("Pending review")).toBeVisible({ timeout: 15_000 });
  });

  test("REVIEWER approves and publishes", async ({ page }) => {
    await loginAs(page, "reviewer");
    await page.goto(admissionUrl);
    await page.getByRole("button", { name: /^approve$/i }).click();
    await expect(page.getByText("Approved")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /^publish$/i }).click();
    await expect(page.getByText("Published")).toBeVisible({ timeout: 15_000 });
  });

  test("the published admission cycle is now visible on the public Admissions page", async ({ page }) => {
    await page.goto("/admissions");
    await expect(page.getByText(academicYear)).toBeVisible();
  });

  test("ADMINISTRATOR can view admissions but cannot create", async ({ page }) => {
    await loginAs(page, "administrator");
    await page.goto("/admin/admissions");
    await expect(page.getByRole("link", { name: /new admission cycle/i })).toHaveCount(0);
  });
});

test.describe("Admissions is scoped to content_admissions, not content_examinations", () => {
  test("EXAMINATION_OFFICER (wrong domain) cannot create an admission cycle", async ({ page }) => {
    await loginAs(page, "examination-officer");
    await page.goto("/admin/admissions/new");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });
});
