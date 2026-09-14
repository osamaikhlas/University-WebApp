import { expect, test, type Page } from "@playwright/test";

/**
 * Full CMS lifecycle for the Departments module (content_general domain), exercised across
 * multiple real roles against the real dev server + seeded database — the strongest
 * evidence that "apply role permissions" actually holds end-to-end, not just in unit tests
 * that mock the permission check.
 */
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

async function loginAs(page: Page, roleSlug: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${roleSlug}@example.invalid`);
  await page.getByLabel("Password").fill(DEV_LOGIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe.serial("Departments CMS module — full workflow across roles", () => {
  const departmentName = `E2E Test Department ${Date.now()}`;
  let departmentUrl = "";

  test("EDITOR can create a department, which starts as a draft", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/departments/new");

    await page.getByLabel("Name").fill(departmentName);
    await page.getByLabel(/description/i).fill("Created by an e2e test.");
    await page.getByRole("button", { name: /create department/i }).click();

    // Wait for content that only exists on the real view page (never the "new" form) before
    // reading the URL — a URL-pattern wait here is racy, since "/admin/departments/new"
    // itself satisfies a naive "/admin/departments/<anything>" regex.
    await expect(page.getByRole("button", { name: /submit for review/i })).toBeVisible();
    departmentUrl = page.url();

    await expect(page.getByText("Draft")).toBeVisible();
    // An author can't approve/publish/reject their own submission — no such buttons exist.
    await expect(page.getByRole("button", { name: /^publish$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^approve$/i })).toHaveCount(0);
  });

  test("EDITOR can submit the department for review", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto(departmentUrl);
    await page.getByRole("button", { name: /submit for review/i }).click();

    await expect(page.getByText("Pending review")).toBeVisible({ timeout: 15_000 });
  });

  test("EDITOR cannot reach the review/approve action even by direct navigation (server-enforced)", async ({
    page,
  }) => {
    await loginAs(page, "editor");
    await page.goto(departmentUrl);
    await expect(page.getByRole("button", { name: /approve/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^publish$/i })).toHaveCount(0);
  });

  test("REVIEWER can see it in the Pending review filter and approve it", async ({ page }) => {
    await loginAs(page, "reviewer");
    await page.goto("/admin/departments?status=PENDING_REVIEW");
    await expect(page.getByRole("link", { name: departmentName })).toBeVisible();

    await page.goto(departmentUrl);
    // A reviewer only approves/rejects/archives — never authors new content.
    await expect(page.getByRole("link", { name: /^edit$/i })).toHaveCount(0);
    await page.getByRole("button", { name: /^approve$/i }).click();

    await expect(page.getByText("Approved")).toBeVisible({ timeout: 15_000 });
  });

  test("REVIEWER can publish the approved department", async ({ page }) => {
    await loginAs(page, "reviewer");
    await page.goto(departmentUrl);
    await page.getByRole("button", { name: /^publish$/i }).click();

    await expect(page.getByText("Published")).toBeVisible({ timeout: 15_000 });
  });

  test("the published department is now visible on the public Academics page", async ({ page }) => {
    await page.goto("/academics");
    await expect(page.getByText(departmentName)).toBeVisible();
  });

  test("ADMINISTRATOR can view the module but has no create/edit/publish controls", async ({
    page,
  }) => {
    await loginAs(page, "administrator");
    await page.goto("/admin/departments");
    await expect(page.getByRole("link", { name: /new department/i })).toHaveCount(0);

    await page.goto(departmentUrl);
    await expect(page.getByRole("link", { name: /^edit$/i })).toHaveCount(0);
    await expect(page.locator('[aria-label="Workflow actions"]')).toHaveCount(0);
  });

  test("ADMINISTRATOR is redirected to /admin/unauthorized when trying to create directly", async ({
    page,
  }) => {
    await loginAs(page, "administrator");
    await page.goto("/admin/departments/new");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });

  test("REVIEWER can archive the department", async ({ page }) => {
    await loginAs(page, "reviewer");
    await page.goto(departmentUrl);
    await page.getByRole("button", { name: /^archive$/i }).click();

    await expect(page.getByText("Archived")).toBeVisible({ timeout: 15_000 });
    // No further actions are possible from ARCHIVED.
    await expect(page.locator('[aria-label="Workflow actions"]')).toHaveCount(0);
  });
});

test.describe("FACULTY_EDITOR is scoped to the content_faculty domain, not content_general", () => {
  test("cannot create a department (wrong permission domain)", async ({ page }) => {
    await loginAs(page, "faculty-editor");
    await page.goto("/admin/departments/new");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });
});
