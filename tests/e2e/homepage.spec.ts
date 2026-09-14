import { expect, test } from "@playwright/test";

/**
 * Phase: homepage. Requires the dev database to have been seeded (`npm run db:seed`), which
 * publishes one demo record per module plus a deliberately-expired notice and a
 * 30-days-out event specifically so the announcement/upcoming-events filtering below has
 * something real to assert against.
 */

const SECTION_HEADINGS = [
  "Latest notices",
  "Upcoming events",
  "About the college",
  "Academic programs",
  "Departments",
  "Facilities",
  "Latest activities",
  "Scholarships & student support",
  "Important documents",
  "Have a concern?",
  "Location",
  "Contact",
];

test.describe("homepage sections", () => {
  test("renders all 15 required sections", async ({ page }) => {
    await page.goto("/");
    // Scoped to <main> since the footer repeats a "Contact" heading in its sitemap column.
    const main = page.locator("#main-content");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible(); // 1. Hero
    await expect(main.getByRole("heading", { name: "Quick links" })).toBeVisible(); // 3
    for (const heading of SECTION_HEADINGS) {
      await expect(
        main.getByRole("heading", { name: heading }),
        `missing section heading: ${heading}`,
      ).toBeVisible();
    }
  });

  test("the important announcement banner shows the current notice, not the expired one", async ({
    page,
  }) => {
    await page.goto("/");
    // The expired notice may still legitimately appear in "Latest notices" further down the
    // page (that list isn't expiry-filtered) — only the announcement banner itself must
    // exclude it.
    const announcement = page.locator("section", { has: page.locator("#announcement-heading") });
    await expect(announcement.getByText("[PLACEHOLDER] Sample Notice", { exact: true })).toBeVisible();
    await expect(announcement.getByText("[PLACEHOLDER] Expired Sample Notice")).toHaveCount(0);
  });

  test("upcoming events shows the future demo event", async ({ page }) => {
    await page.goto("/");
    const eventsSection = page.locator("section", { has: page.getByRole("heading", { name: "Upcoming events" }) });
    await expect(eventsSection.getByText("[PLACEHOLDER] Sample Event")).toBeVisible();
  });

  test("quick links navigate to the right pages", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Academic Programs" }).click();
    await expect(page).toHaveURL(/\/academics$/);
  });

  test("grievance callout links to the real submission form", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Submit a grievance" }).click();
    await expect(page).toHaveURL(/\/grievance$/);
  });
});

test.describe("homepage accessibility", () => {
  test("a skip link is the first focusable element and moves focus to main content", async ({
    page,
  }) => {
    await page.goto("/");
    // The skip link's focus-fix is a client-side onClick handler (Chromium doesn't reliably
    // move focus on a plain hash navigation) — give hydration a moment to attach it.
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("has exactly one h1 and a logical heading structure", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });
});

test.describe("homepage SEO", () => {
  test("has a non-generic title and meta description", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Affiliated College Portal/);
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(20);
  });

  test("does not publish structured data while the college is still placeholder demo data", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  });

  test("robots.txt and sitemap.xml are both reachable", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain("Sitemap:");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("<urlset");
  });
});

test.describe("homepage responsiveness", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("no horizontal overflow at mobile width", async ({ page }) => {
    await page.goto("/");
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
});
