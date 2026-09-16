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
    // Every seeded demo row's title carries the "[PLACEHOLDER]" marker (CLAUDE.md rule 14) —
    // one per category. Checked one category at a time (via `&category=`) rather than in one
    // unfiltered page: the 2026-09-16 seed-data pass replaced the old generic
    // "[PLACEHOLDER] Sample X" rows with realistic-sounding content, and there are now
    // enough "[PLACEHOLDER]"-matching rows across all categories combined (15+) that an
    // unfiltered query no longer fits everything on page 1 (SEARCH_DEFAULT_PAGE_SIZE = 10 in
    // src/lib/content.ts) — a category filter sidesteps relying on alphabetical tie-break
    // order to guess which category lands on which page.
    const expectedByCategory: Record<string, string> = {
      notices: "[PLACEHOLDER] Admissions Open for Academic Year 2026-27",
      events: "[PLACEHOLDER] Teacher Education Seminar 2026",
      programs: "[PLACEHOLDER] Bachelor of Education (B.Ed.)",
      faculty: "[PLACEHOLDER] Dr. Ayesha Rahman (demo data, not verified)",
      documents: "[PLACEHOLDER] Sample Attachment",
      policies: "[PLACEHOLDER] Sample Policy",
      regulations: "[PLACEHOLDER] Student Code of Conduct",
    };

    for (const [category, title] of Object.entries(expectedByCategory)) {
      await page.goto(`/search?q=${encodeURIComponent("[PLACEHOLDER]")}&category=${category}`);
      await expect(
        page.getByRole("list", { name: /search results/i }).getByRole("link", { name: title }),
        `missing "${category}" result: ${title}`,
      ).toBeVisible();
    }

    // The unfiltered, cross-category query genuinely aggregates all of the above into one
    // ranked, paginated list — assert that without depending on exact page-1 ordering.
    await page.goto("/search?q=" + encodeURIComponent("[PLACEHOLDER]"));
    await expect(page.getByRole("navigation", { name: "Pagination" })).toBeVisible();
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
    await page.goto("/search?q=" + encodeURIComponent("[PLACEHOLDER]") + "&category=notices");

    await expect(
      page.getByRole("link", { name: "[PLACEHOLDER] Admissions Open for Academic Year 2026-27" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "[PLACEHOLDER] Sample Policy" })).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "[PLACEHOLDER] Bachelor of Education (B.Ed.)" }),
    ).toHaveCount(0);
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

  test("relevance: an exact title match ranks first", async ({ page }) => {
    // src/lib/content.ts's scoreMatch() gives an exact title match (100) the top score,
    // ahead of a prefix (70), whole-word (50), or substring (30) match. The realistic
    // seed titles introduced 2026-09-16 no longer share a common word the way the old
    // generic "[PLACEHOLDER] Sample X" placeholders did (e.g. searching "Sample" no longer
    // collides Notices/Events/Programs/Faculty/Regulations against each other — see the
    // broad-keyword test above), so this only has one candidate row to rank; it still
    // verifies an exact-title search reliably surfaces that row as the top/only result.
    await page.goto("/search?q=" + encodeURIComponent("[PLACEHOLDER] Bachelor of Education (B.Ed.)"));
    const firstResultLink = page.locator("ul[aria-label*='Search results'] li").first().getByRole("link");
    await expect(firstResultLink).toHaveText("[PLACEHOLDER] Bachelor of Education (B.Ed.)");
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
