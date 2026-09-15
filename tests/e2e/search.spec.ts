import { expect, test, type Page } from "@playwright/test";

/**
 * Global site search: keyword search across pages/notices/events/programs/faculty/documents/
 * policies/regulations, category filtering, relevance ordering, pagination wiring, the empty
 * state, and the privacy guarantee that draft/unpublished content is never searchable
 * publicly — exercised against the real dev server + seeded database.
 */
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

async function loginAs(page: Page, roleSlug: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${roleSlug}@example.invalid`);
  await page.getByLabel("Password").fill(DEV_LOGIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe("Global search", () => {
  test("a broad keyword returns results from every database-backed category", async ({ page }) => {
    // Every seeded [PLACEHOLDER] demo row's title contains "Sample" — one per category.
    await page.goto("/search?q=Sample");
    const results = page.getByRole("list", { name: /search results/i });

    // Both the current and expired seeded notices contain "Sample" in their titles, so this
    // label legitimately appears twice.
    await expect(results.getByText("Notices", { exact: true }).first()).toBeVisible();
    await expect(results.getByRole("link", { name: "[PLACEHOLDER] Sample Notice" })).toBeVisible();

    await expect(results.getByRole("link", { name: "[PLACEHOLDER] Sample Event" })).toBeVisible();
    await expect(results.getByRole("link", { name: "[PLACEHOLDER] BS Sample Studies" })).toBeVisible();
    await expect(results.getByRole("link", { name: "[PLACEHOLDER] Dr. Sample Faculty" })).toBeVisible();
    await expect(results.getByRole("link", { name: "[PLACEHOLDER] Sample Attachment" })).toBeVisible();
    await expect(results.getByRole("link", { name: "[PLACEHOLDER] Sample Policy" })).toBeVisible();
    await expect(results.getByRole("link", { name: "[PLACEHOLDER] Sample Regulation" })).toBeVisible();
  });

  test("static pages are searchable by keyword, not just database content", async ({ page }) => {
    await page.goto("/search?q=grievance");
    const results = page.getByRole("list", { name: /search results/i });
    const result = results.getByRole("link", { name: "Grievance" });
    await expect(result).toBeVisible();
    await expect(result).toHaveAttribute("href", "/grievance");
    await expect(results.getByText("Pages", { exact: true })).toBeVisible();
  });

  test("a category filter narrows results to only that category", async ({ page }) => {
    await page.goto("/search?q=Sample&category=notices");

    await expect(page.getByRole("link", { name: "[PLACEHOLDER] Sample Notice" })).toBeVisible();
    await expect(page.getByRole("link", { name: "[PLACEHOLDER] Sample Policy" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "[PLACEHOLDER] BS Sample Studies" })).toHaveCount(0);
  });

  test("filtering to a category with no matches shows the empty state", async ({ page }) => {
    // "grievance" matches the static Grievance page but no seeded Notice title/body.
    await page.goto("/search?q=grievance&category=notices");
    await expect(page.getByText(/no published results found/i)).toBeVisible();
  });

  test("a nonsense query shows the empty state, not an error", async ({ page }) => {
    await page.goto("/search?q=zzznonexistentqueryzzz");
    await expect(page.getByText(/no published results found/i)).toBeVisible();
  });

  test("an empty query shows neither results nor the empty state", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByText(/no published results found/i)).toHaveCount(0);
    await expect(page.getByRole("list", { name: /search results/i })).toHaveCount(0);
  });

  test("relevance: an exact title match ranks above a partial match", async ({ page }) => {
    // The seeded program's name is "[PLACEHOLDER] BS Sample Studies" — searching its exact
    // title should surface it before any other broader "Sample"-matching row.
    await page.goto("/search?q=" + encodeURIComponent("[PLACEHOLDER] BS Sample Studies"));
    const firstResultLink = page.locator("ul[aria-label*='Search results'] li").first().getByRole("link");
    await expect(firstResultLink).toHaveText("[PLACEHOLDER] BS Sample Studies");
  });

  test("pagination controls are absent when everything fits on one page", async ({ page }) => {
    await page.goto("/search?q=Sample&category=notices");
    await expect(page.getByRole("navigation", { name: /pagination/i })).toHaveCount(0);
  });

  test("draft (unpublished) content is never returned, even with a matching query", async ({ page }) => {
    const draftTitle = `E2E Draft Search Test ${Date.now()}`;

    await loginAs(page, "editor");
    await page.goto("/admin/notices/new");
    await page.locator("#title").fill(draftTitle);
    await page.locator("#body").fill("This notice should never be publicly searchable while it is a draft.");
    await page.getByRole("button", { name: /create notice/i }).click();
    await page.waitForURL((url) => !url.pathname.endsWith("/new"));
    await expect(page.getByText("Draft").first()).toBeVisible();

    await page.goto(`/search?q=${encodeURIComponent(draftTitle)}`);
    await expect(page.getByText(/no published results found/i)).toBeVisible();
    await expect(page.getByRole("link", { name: draftTitle })).toHaveCount(0);
  });
});
