import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-end "does the real product actually work" walkthrough, driven with real browser
 * automation against the real dev server + seeded database — not a substitute for the
 * narrower, more exhaustive specs elsewhere in this directory, but a single continuous story
 * a human reviewer or QA engineer would actually click through: the public site's main
 * sections, then the full admin notice lifecycle (create → draft → submit → review → approve
 * → publish → verify publicly → edit → audit trail), then the compliance dashboard's
 * verification action — each step exercised exactly as a real visitor/admin would use it
 * (typing into the real search box and clicking Search, not just navigating to `?q=`;
 * following the real Edit link, not calling a Server Action directly). Also covers a mobile
 * viewport slice of the same journey (375×812, the convention already used elsewhere in this
 * suite — see tests/e2e/public-content.spec.ts).
 */
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

async function loginAs(page: Page, roleSlug: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${roleSlug}@example.invalid`);
  await page.getByLabel("Password").fill(DEV_LOGIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe("Public site walkthrough", () => {
  test("1. homepage opens and identifies the site", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/./);
    await expect(page.getByRole("banner").getByRole("link", { name: /affiliated college portal/i })).toBeVisible();
  });

  test("2. main menu navigates to key public sections", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary" });

    await nav.getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible();

    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Academics" }).click();
    await expect(page).toHaveURL(/\/academics$/);
    await expect(page.getByRole("heading", { level: 1, name: "Academics" })).toBeVisible();
  });

  test("3. open a notice on the Notices page", async ({ page }) => {
    await page.goto("/notices");
    await expect(page.getByRole("heading", { level: 1, name: "Notices" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "[PLACEHOLDER] Admissions Open for Academic Year 2026-27", exact: true }),
    ).toBeVisible();
  });

  test("4. search for a program via the real search box", async ({ page }) => {
    await page.goto("/search");
    // Not getByLabel("Search") — the redesigned header (src/components/layout/PublicHeader.tsx)
    // added two "Search the site" links (utility bar + icon), both of which also match
    // getByLabel's substring search, making it ambiguous. The searchbox role is unique.
    await page.getByRole("searchbox", { name: "Search" }).fill("Bachelor of Education");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(/\/search\?q=/);
    await expect(
      page
        .getByRole("list", { name: /search results/i })
        .getByRole("link", { name: "[PLACEHOLDER] Bachelor of Education (B.Ed.)" }),
    ).toBeVisible();
  });

  test("5. open the Faculty page", async ({ page }) => {
    await page.goto("/faculty");
    await expect(page.getByRole("heading", { level: 1, name: "Faculty" })).toBeVisible();
    await expect(page.getByText("[PLACEHOLDER] Dr. Ayesha Rahman")).toBeVisible();
  });

  test("6. open the Admissions page", async ({ page }) => {
    await page.goto("/admissions");
    await expect(page.getByRole("heading", { level: 1, name: "Admissions" })).toBeVisible();
  });

  test("7. open the Gallery page", async ({ page }) => {
    await page.goto("/gallery");
    await expect(page.getByRole("heading", { level: 1, name: "Gallery" })).toBeVisible();
  });

  test("8. open the Downloads page", async ({ page }) => {
    await page.goto("/downloads");
    await expect(page.getByRole("heading", { level: 1, name: "Downloads" })).toBeVisible();
  });

  test("9. open the Grievance form", async ({ page }) => {
    await page.goto("/grievance");
    await expect(page.getByRole("heading", { level: 1, name: "Grievance" })).toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Subject")).toBeVisible();
    await expect(page.getByLabel("Description")).toBeVisible();
    await expect(page.getByRole("button", { name: /submit grievance/i })).toBeVisible();
  });

  test("10. open the Contact page", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByRole("heading", { level: 1, name: "Contact" })).toBeVisible();
  });
});

test.describe.serial("Admin walkthrough — full notice lifecycle + compliance verification", () => {
  const noticeTitle = `E2E Walkthrough Notice ${Date.now()}`;
  let noticeUrl = "";

  test("1-2. login and reach the dashboard", async ({ page }) => {
    await loginAs(page, "super-admin");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  });

  test("3-4. create a notice, saved as a Draft", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto("/admin/notices/new");
    await page.getByLabel("Title").fill(noticeTitle);
    await page.getByLabel("Body").fill("Created by the full-application-walkthrough e2e test.");
    await page.getByRole("button", { name: /create notice/i }).click();
    await page.waitForURL((url) => !url.pathname.endsWith("/new"));
    noticeUrl = page.url();

    await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  });

  test("5. submit for review", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto(noticeUrl);
    await page.getByRole("button", { name: /submit for review/i }).click();
    await expect(page.getByText("Submitted", { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test("6. approve (start review, then approve)", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto(noticeUrl);
    await page.getByRole("button", { name: /start review/i }).click();
    await expect(page.getByText("Under review")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^approve$/i }).click();
    await expect(page.getByText("Approved", { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test("7. publish", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto(noticeUrl);
    await page.getByRole("button", { name: /^publish$/i }).click();
    await expect(page.getByText("Published", { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test("8. verify the notice publicly, as a signed-out visitor", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/notices");
    await expect(page.getByRole("heading", { name: noticeTitle, exact: true })).toBeVisible();
    await expect(page.getByText("Created by the full-application-walkthrough e2e test.")).toBeVisible();
    await context.close();
  });

  test("9. edit the notice", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto(noticeUrl);
    await page.getByRole("link", { name: /^edit$/i }).click();
    await page.waitForURL(/\/edit$/);

    await page.getByLabel("Body").fill("Updated by the full-application-walkthrough e2e test.");
    await page.getByRole("button", { name: /save changes/i }).click();
    await page.waitForURL((url) => !url.pathname.endsWith("/edit"));

    await expect(page.getByText("Updated by the full-application-walkthrough e2e test.")).toBeVisible();
    // Editing must not silently revert a published item's status (an established, deliberate
    // behavior in this app — see progress.md's 2026-09-14 decisions log).
    await expect(page.getByText("Published", { exact: true })).toBeVisible();
  });

  test("10. check the notice's audit history", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto("/admin/audit-logs");
    await page.getByLabel("Entity type").fill("Notice");
    await page.getByRole("button", { name: /filter|apply|search/i }).click();

    await expect(page.getByRole("link", { name: "Create", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Publish", exact: true }).first()).toBeVisible();
  });

  test("11-12. open the Compliance dashboard and verify a requirement", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto("/admin/compliance");
    await expect(page.getByRole("heading", { name: "Compliance" })).toBeVisible();

    await page.getByRole("link", { name: "Faculty details", exact: true }).click();
    await page.waitForURL(/\/admin\/compliance\/[a-z0-9]+$/);

    // This requirement's status is shared, persistent fixture state (not created fresh by
    // this test), so normalize whatever a prior run left it in until it reaches
    // READY_FOR_REVIEW, then verify it — mirroring tests/e2e/cms-compliance.spec.ts's
    // established pattern for this same non-resettable-between-runs data.
    for (let i = 0; i < 4; i++) {
      if (await page.getByText("Ready for review", { exact: true }).isVisible().catch(() => false)) break;

      if (await page.getByRole("button", { name: /submit for review/i }).isVisible().catch(() => false)) {
        await page.getByRole("button", { name: /submit for review/i }).click();
      } else if (await page.getByRole("button", { name: /^reopen$/i }).isVisible().catch(() => false)) {
        await page.getByRole("button", { name: /^reopen$/i }).click();
      } else if (await page.getByRole("button", { name: /^reject/i }).isVisible().catch(() => false)) {
        await page.getByLabel(/reviewer notes/i).fill("Walkthrough test: resetting to a known state.");
        await page.getByRole("button", { name: /^reject/i }).click();
      } else {
        break;
      }
      await page.waitForTimeout(500);
    }

    await expect(page.getByText("Ready for review", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /^verify$/i }).click();
    await expect(page.getByText("Verified", { exact: true })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Mobile viewport walkthrough (375×812)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("public: hamburger menu opens and reaches a section, with no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);

    await page.getByRole("button", { name: /open menu/i }).click();
    const panel = page.getByRole("navigation", { name: "Primary" });
    await expect(panel).toBeVisible();
    await panel.getByRole("link", { name: "Notices" }).click();
    await expect(page).toHaveURL(/\/notices$/);
    await expect(page.getByRole("heading", { level: 1, name: "Notices" })).toBeVisible();
  });

  test("admin: login and dashboard render usably at mobile width", async ({ page }) => {
    await loginAs(page, "super-admin");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
});
