import { expect, test, type Page } from "@playwright/test";

/**
 * Location is a singleton per college (like College Profile), but `Location.collegeId` has
 * no `@unique` constraint — the "does one already exist" guard uses `findFirst` instead of
 * `findUnique`. The seeded database already has one PUBLISHED demo location, so this spec
 * exercises the singleton guard against real pre-existing data (redirecting away from
 * "new") and the "editing doesn't revert status" policy (editing a PUBLISHED record in
 * place keeps it PUBLISHED), rather than a from-scratch create lifecycle.
 */
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

async function loginAs(page: Page, roleSlug: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${roleSlug}@example.invalid`);
  await page.getByLabel("Password").fill(DEV_LOGIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe.serial("Location CMS module (singleton, findFirst-based guard)", () => {
  const address = `E2E Test Address ${Date.now()}, Test City`;

  test("visiting /admin/location/new redirects to the view page since a location already exists", async ({
    page,
  }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/location/new");
    await expect(page).toHaveURL(/\/admin\/location$/);
  });

  test("EDITOR can update the address without reverting its PUBLISHED status", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/location/edit");
    await page.locator("#address").fill(address);
    await page.getByRole("button", { name: /save changes/i }).click();

    await expect(page.getByText(address)).toBeVisible();
    await expect(page.getByText("Published")).toBeVisible();
  });

  test("the updated address is now visible on the public Campus page", async ({ page }) => {
    await page.goto("/campus");
    await expect(page.getByText(address)).toBeVisible();
  });

  test("FACULTY_EDITOR (wrong domain) cannot edit the location", async ({ page }) => {
    await loginAs(page, "faculty-editor");
    await page.goto("/admin/location/edit");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });
});
