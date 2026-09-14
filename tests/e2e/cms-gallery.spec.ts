import { expect, test, type Page } from "@playwright/test";

/**
 * Full CMS lifecycle for the Gallery module — the first e2e coverage of a nested-resource
 * CMS module (GalleryAlbum -> GalleryItem, where creating an item also creates a fresh
 * Media asset in the same action), exercised against the real dev server + seeded database.
 */
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

async function loginAs(page: Page, roleSlug: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${roleSlug}@example.invalid`);
  await page.getByLabel("Password").fill(DEV_LOGIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe.serial("Gallery CMS module (nested album -> item resources)", () => {
  const albumTitle = `E2E Test Album ${Date.now()}`;
  const itemCaption = `E2E Test Photo ${Date.now()}`;
  let albumUrl = "";
  let itemUrl = "";

  test("EDITOR can create an album, which starts as a draft", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/gallery/new");

    await page.locator("#title").fill(albumTitle);
    await page.getByRole("button", { name: /create album/i }).click();

    await page.waitForURL((url) => !url.pathname.endsWith("/new"));
    albumUrl = page.url();
    await expect(page.getByText("Draft").first()).toBeVisible();
  });

  test("EDITOR can add an item to the album, creating a Media asset inline", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto(`${albumUrl}/items/new`);

    await page.locator("#url").fill("https://example.invalid/e2e-photo.jpg");
    await page.locator("#altText").fill("A test photo for e2e coverage");
    await page.locator("#caption").fill(itemCaption);
    await page.getByRole("button", { name: /add item/i }).click();

    await page.waitForURL((url) => !url.pathname.endsWith("/new"));
    itemUrl = page.url();
    await expect(page.getByText("Draft").first()).toBeVisible();
  });

  test("EDITOR submits both for review, then REVIEWER approves and publishes both", async ({
    page,
  }) => {
    await loginAs(page, "editor");
    await page.goto(albumUrl);
    await page.getByRole("button", { name: /submit for review/i }).click();
    await expect(page.getByText("Submitted")).toBeVisible({ timeout: 15_000 });

    await page.goto(itemUrl);
    await page.getByRole("button", { name: /submit for review/i }).click();
    await expect(page.getByText("Submitted")).toBeVisible({ timeout: 15_000 });
  });

  test("REVIEWER starts review, approves, and publishes both the album and the item", async ({
    page,
  }) => {
    await loginAs(page, "reviewer");

    await page.goto(albumUrl);
    await page.getByRole("button", { name: /start review/i }).click();
    await expect(page.getByText("Under review")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^approve$/i }).click();
    await expect(page.getByText("Approved")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^publish$/i }).click();
    await expect(page.getByText("Published")).toBeVisible({ timeout: 15_000 });

    await page.goto(itemUrl);
    await page.getByRole("button", { name: /start review/i }).click();
    await expect(page.getByText("Under review")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^approve$/i }).click();
    await expect(page.getByText("Approved")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^publish$/i }).click();
    await expect(page.getByText("Published")).toBeVisible({ timeout: 15_000 });
  });

  test("the published album and item are now visible on the public Gallery page", async ({
    page,
  }) => {
    await page.goto("/gallery");
    await expect(page.getByRole("heading", { name: albumTitle })).toBeVisible();
    await expect(page.getByText(itemCaption)).toBeVisible();
  });
});

test.describe("Gallery is scoped to content_general, not content_faculty", () => {
  test("FACULTY_EDITOR (wrong domain) cannot create an album", async ({ page }) => {
    await loginAs(page, "faculty-editor");
    await page.goto("/admin/gallery/new");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });
});
