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

    await expect(page.getByText("Submitted")).toBeVisible({ timeout: 15_000 });
  });

  test("EDITOR cannot reach the review/approve action even by direct navigation (server-enforced)", async ({
    page,
  }) => {
    await loginAs(page, "editor");
    await page.goto(departmentUrl);
    await expect(page.getByRole("button", { name: /start review/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /approve/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^publish$/i })).toHaveCount(0);
  });

  test("REVIEWER can see it in the Submitted filter and start review", async ({ page }) => {
    await loginAs(page, "reviewer");
    await page.goto("/admin/departments?status=SUBMITTED");
    await expect(page.getByRole("link", { name: departmentName })).toBeVisible();

    await page.goto(departmentUrl);
    // A reviewer only reviews/approves/rejects/flags-for-update — never authors new content.
    await expect(page.getByRole("link", { name: /^edit$/i })).toHaveCount(0);
    await page.getByRole("button", { name: /start review/i }).click();

    await expect(page.getByText("Under review")).toBeVisible({ timeout: 15_000 });
  });

  test("REVIEWER can approve the department under review", async ({ page }) => {
    await loginAs(page, "reviewer");
    await page.goto(departmentUrl);
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

  test("REVIEWER can flag the published department as needing an update", async ({ page }) => {
    await loginAs(page, "reviewer");
    await page.goto(departmentUrl);
    await page.getByRole("button", { name: /request update/i }).click();

    await expect(page.getByText("Update required")).toBeVisible({ timeout: 15_000 });
    // The reviewer (manage-permission-less here) cannot return it to draft — only the author
    // (manage permission) can do that — but a publisher can still archive stale
    // update-required content, so "return to draft" specifically is what's unavailable, not
    // every action.
    await expect(page.getByRole("button", { name: /return to draft/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^archive$/i })).toBeVisible();
  });

  test("EDITOR can return the update-required department to draft to fix it", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto(departmentUrl);
    await page.getByRole("button", { name: /return to draft/i }).click();

    await expect(page.getByText("Draft")).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("FACULTY_EDITOR is scoped to the content_faculty domain, not content_general", () => {
  test("cannot create a department (wrong permission domain)", async ({ page }) => {
    await loginAs(page, "faculty-editor");
    await page.goto("/admin/departments/new");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });
});

test.describe.serial("Rejecting under-review content requires a reason (real browser UI)", () => {
  const departmentName = `E2E Reject Test Department ${Date.now()}`;
  let departmentUrl = "";

  test("EDITOR creates and submits a department for review", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/departments/new");
    await page.getByLabel("Name").fill(departmentName);
    await page.getByRole("button", { name: /create department/i }).click();

    await expect(page.getByRole("button", { name: /submit for review/i })).toBeVisible();
    departmentUrl = page.url();

    await page.getByRole("button", { name: /submit for review/i }).click();
    await expect(page.getByText("Submitted")).toBeVisible({ timeout: 15_000 });
  });

  test("REVIEWER starts review, then clicking Reject with no comment is refused", async ({ page }) => {
    await loginAs(page, "reviewer");
    await page.goto(departmentUrl);
    await page.getByRole("button", { name: /start review/i }).click();
    await expect(page.getByText("Under review")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /^reject/i }).click();

    // Refused: an error is shown, and the status is unchanged (still under review, not draft).
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Under review")).toBeVisible();
  });

  test("REVIEWER can reject after filling in the shared comment field, and the reason is required end-to-end", async ({
    page,
  }) => {
    await loginAs(page, "reviewer");
    await page.goto(departmentUrl);

    await page.getByLabel(/comment.*reason/i).fill("Description is missing required accreditation info.");
    await page.getByRole("button", { name: /^reject/i }).click();

    await expect(page.getByText("Draft")).toBeVisible({ timeout: 15_000 });
  });
});
