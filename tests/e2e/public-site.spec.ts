import { expect, test } from "@playwright/test";
import { PUBLIC_NAV_LINKS } from "../../src/lib/navigation";

test("home page loads and identifies itself as a placeholder", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Affiliated College Portal",
  );
  await expect(page.getByText(/development placeholder/i).first()).toBeVisible();
});

test("every public nav link resolves without a server error", async ({ page }) => {
  for (const link of PUBLIC_NAV_LINKS) {
    const response = await page.goto(link.href);
    expect(response?.status(), `${link.href} should not error`).toBeLessThan(500);
  }
});

test("an unknown route renders the not-found page", async ({ page }) => {
  const response = await page.goto("/this-route-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});
