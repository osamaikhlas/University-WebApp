import { expect, test } from "@playwright/test";
import { ADMIN_NAV_LINKS } from "../../src/lib/navigation";

test("admin dashboard loads and shows the no-auth development banner", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText(/authentication.*not implemented/i)).toBeVisible();
});

test("every admin nav link resolves without a server error", async ({ page }) => {
  for (const link of ADMIN_NAV_LINKS) {
    const response = await page.goto(link.href);
    expect(response?.status(), `${link.href} should not error`).toBeLessThan(500);
  }
});
