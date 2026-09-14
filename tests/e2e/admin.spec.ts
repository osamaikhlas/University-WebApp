import { expect, test } from "@playwright/test";
import { ADMIN_NAV_LINKS } from "../../src/lib/navigation";

test("unauthenticated visitors are redirected to /login, not the dashboard", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();
});

test("every admin nav link redirects an unauthenticated visitor to /login rather than erroring", async ({
  page,
}) => {
  for (const link of ADMIN_NAV_LINKS) {
    const response = await page.goto(link.href);
    expect(response?.status(), `${link.href} should not error`).toBeLessThan(500);
    await expect(page, `${link.href} should redirect to /login when unauthenticated`).toHaveURL(
      /\/login$/,
    );
  }
});
