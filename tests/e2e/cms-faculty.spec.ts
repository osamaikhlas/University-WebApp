import { expect, test, type Page } from "@playwright/test";

const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

async function loginAs(page: Page, roleSlug: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${roleSlug}@example.invalid`);
  await page.getByLabel("Password").fill(DEV_LOGIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe.serial("Faculty CMS module (content_faculty domain)", () => {
  const facultyName = `E2E Test Faculty ${Date.now()}`;
  let facultyUrl = "";

  test("FACULTY_EDITOR can create a faculty record with a department and subjects", async ({
    page,
  }) => {
    await loginAs(page, "faculty-editor");
    await page.goto("/admin/faculty/new");

    await page.getByLabel("Name").fill(facultyName);
    await page.getByLabel("Designation").fill("Assistant Professor");
    await page.getByLabel(/department/i).selectOption({ index: 1 });
    await page.getByLabel(/subjects taught/i).fill("Databases, Operating Systems");
    await page.getByRole("button", { name: /create faculty record/i }).click();

    // Wait for content that only exists on the real view page (never the "new" form) before
    // reading the URL — a URL-pattern wait here is racy, since "/admin/faculty/new" itself
    // satisfies a naive "/admin/faculty/<anything>" regex.
    await expect(page.getByText("Databases, Operating Systems")).toBeVisible();
    facultyUrl = page.url();

    await expect(page.getByText("Draft")).toBeVisible();
  });

  test("FACULTY_EDITOR cannot publish their own submission", async ({ page }) => {
    await loginAs(page, "faculty-editor");
    await page.goto(facultyUrl);
    await page.getByRole("button", { name: /submit for review/i }).click();

    // Confirm the transition actually completed (not just that no approve/publish button
    // exists — that'd also be true, misleadingly, if the click had silently failed to do
    // anything at all).
    await expect(page.getByText("Pending review")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /^approve$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^publish$/i })).toHaveCount(0);
  });

  test("PRINCIPAL can approve and publish faculty content (content_faculty:publish)", async ({
    page,
  }) => {
    await loginAs(page, "principal");
    await page.goto(facultyUrl);
    await page.getByRole("button", { name: /^approve$/i }).click();
    await expect(page.getByText("Approved")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /^publish$/i }).click();
    await expect(page.getByText("Published")).toBeVisible({ timeout: 15_000 });
  });

  test("the published faculty member is now visible on the public Faculty page", async ({
    page,
  }) => {
    await page.goto("/faculty");
    await expect(page.getByText(facultyName)).toBeVisible();
  });
});

test.describe("EDITOR is scoped to content_general, not content_faculty", () => {
  test("cannot create a faculty record", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/faculty/new");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });
});
