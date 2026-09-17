import { expect, test, type Page } from "@playwright/test";

/**
 * Account creation on /admin/users — previously the only way to add an admin account was
 * prisma/seed.ts (env-var passwords), not something a real Principal/Administrator could do
 * themselves. Added per explicit user instruction ("how to add new users?").
 */
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

async function loginAs(page: Page, roleSlug: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${roleSlug}@example.invalid`);
  await page.getByLabel("Password").fill(DEV_LOGIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe("Create user", () => {
  test("SUPER_ADMIN creates a user with a starting role, and that person can sign in", async ({
    page,
    browser,
  }) => {
    const email = `e2e-created-${Date.now()}@example.invalid`;
    const password = "E2eCreatedPw!123";

    await loginAs(page, "super-admin");
    await page.goto("/admin/users");

    await page.getByLabel("Name").fill("E2E Created User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Initial password").fill(password);
    await page.getByLabel(/starting role/i).selectOption("EDITOR");
    await page.getByRole("button", { name: /create user/i }).click();
    await page.waitForURL(/\/admin\/users$/);

    const card = page.locator(`[data-user-card="${email}"]`);
    await expect(card).toBeVisible();
    // Rendered as a "remove role" button whose accessible name is "Remove EDITOR from <name>"
    // (an explicit aria-label), not the visible "EDITOR ✕" text content.
    await expect(card.getByRole("button", { name: /Remove EDITOR from/i })).toBeVisible();

    // The new account can actually sign in — proves the password was really set, not just
    // displayed as accepted.
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();
    await newPage.goto("/login");
    await newPage.getByLabel("Email").fill(email);
    await newPage.getByLabel("Password").fill(password);
    await newPage.getByRole("button", { name: /sign in/i }).click();
    await newPage.waitForURL(/\/admin$/);
    await expect(newPage.getByText(/Signed in as E2E Created User/i)).toBeVisible();
    await newContext.close();
  });

  test("rejects creating a second account with an email already in use", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto("/admin/users");

    await page.getByLabel("Name").fill("Duplicate Attempt");
    await page.getByLabel("Email").fill("super-admin@example.invalid");
    await page.getByLabel("Initial password").fill("SomeLongEnoughPw1");
    await page.getByRole("button", { name: /create user/i }).click();

    await expect(page.getByText(/already exists/i)).toBeVisible();
  });

  test("EDITOR (no users:manage) is redirected to /admin/unauthorized", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });
});
