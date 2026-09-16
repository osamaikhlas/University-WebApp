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
  test("a per-category keyword returns the expected real result in every database-backed category", async ({
    page,
  }) => {
    // The 2026-09-16 seed-data pass replaced the fictional "[PLACEHOLDER]"-tagged demo
    // college with real content for Sindh Muslim Government Science College, Karachi — real
    // content has no shared marker string across categories the way the old demo data did
    // (every old row's title carried "[PLACEHOLDER]"), so each category needs its own
    // realistic query term rather than one query reused everywhere.
    const casesByCategory: Record<string, { query: string; title: string }> = {
      notices: { query: "Academic Activities", title: "Academic Activities and Student Discipline" },
      events: { query: "Science Exhibition", title: "Annual Science Exhibition" },
      programs: { query: "Pre-Medical", title: "F.Sc. Pre-Medical" },
      faculty: { query: "Ahmed Khan", title: "Dr. Muhammad Ahmed Khan" },
      documents: { query: "Recognition Letter", title: "Affiliation / Recognition Letter — HEC" },
      policies: { query: "Grievance Handling", title: "Grievance Handling Procedure" },
      regulations: { query: "Code of Conduct", title: "Student Code of Conduct" },
    };

    for (const [category, { query, title }] of Object.entries(casesByCategory)) {
      await page.goto(`/search?q=${encodeURIComponent(query)}&category=${category}`);
      await expect(
        page.getByRole("list", { name: /search results/i }).getByRole("link", { name: title }),
        `missing "${category}" result: ${title}`,
      ).toBeVisible();
    }
  });

  test("static pages are searchable by keyword, not just database content", async ({ page }) => {
    await page.goto("/search?q=grievance");
    const results = page.getByRole("list", { name: /search results/i });
    // exact: true — the real "Grievance Handling Procedure" policy also matches "grievance"
    // and would otherwise collide with the static Grievance page's plain "Grievance" link.
    const result = results.getByRole("link", { name: "Grievance", exact: true });
    await expect(result).toBeVisible();
    await expect(result).toHaveAttribute("href", "/grievance");
    await expect(results.getByText("Pages", { exact: true })).toBeVisible();
  });

  test("a category filter narrows results to only that category", async ({ page }) => {
    // "Examination" matches both the notices category (Mid-Term/Annual Examination Notice)
    // and, unfiltered, would also surface the "Examinations" static page — filtering to
    // category=notices must exclude that static-page result. Scoped to the results list
    // itself, not the whole page — the primary nav also has an "Examinations" link.
    await page.goto("/search?q=" + encodeURIComponent("Examination") + "&category=notices");
    const results = page.getByRole("list", { name: /search results/i });

    await expect(results.getByRole("link", { name: "Mid-Term Examination Notice" })).toBeVisible();
    await expect(results.getByRole("link", { name: "Annual Examination Notice" })).toBeVisible();
    await expect(results.getByRole("link", { name: "Examinations", exact: true })).toHaveCount(0);
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
    // ahead of a prefix (70), whole-word (50), or substring (30) match. "Student Code of
    // Conduct" is a unique title with no other row sharing enough of it to compete, so this
    // verifies an exact-title search reliably surfaces that row as the top/only result.
    await page.goto("/search?q=" + encodeURIComponent("Student Code of Conduct"));
    const firstResultLink = page.locator("ul[aria-label*='Search results'] li").first().getByRole("link");
    await expect(firstResultLink).toHaveText("Student Code of Conduct");
  });

  test("pagination controls are absent when everything fits on one page", async ({ page }) => {
    await page.goto("/search?q=Examination&category=notices");
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
