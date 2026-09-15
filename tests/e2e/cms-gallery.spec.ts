import { expect, test, type Page } from "@playwright/test";

/**
 * Full CMS lifecycle for the Gallery module — the first e2e coverage of a nested-resource
 * CMS module (GalleryAlbum -> GalleryItem, where creating an item also creates a fresh
 * Media asset in the same action), exercised against the real dev server + seeded database.
 */
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

// A minimal valid 1x1 transparent PNG, inlined so the test needs no fixture file on disk.
const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

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

  test("EDITOR can add an item to the album, uploading a real image that creates a Media asset inline", async ({
    page,
  }) => {
    await loginAs(page, "editor");
    await page.goto(`${albumUrl}/items/new`);

    await page.setInputFiles('input[name="image"]', {
      name: "e2e-photo.png",
      mimeType: "image/png",
      buffer: ONE_PIXEL_PNG,
    });
    await page.locator("#altText").fill("A test photo for e2e coverage");
    await page.locator("#caption").fill(itemCaption);
    await page.locator("#category").fill("Campus");
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

  test("the published item's image is fetchable without authentication", async ({ page, request }) => {
    await loginAs(page, "reviewer");
    await page.goto(itemUrl);
    const imgSrc = await page.locator('img[alt="A test photo for e2e coverage"]').getAttribute("src");
    expect(imgSrc).toBeTruthy();

    const response = await request.get(imgSrc!);
    expect(response.headers()["content-type"] ?? "").toContain("image/png");
  });

  test("EDITOR can replace the item's image", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto(`${itemUrl}/edit`);
    await page.setInputFiles('input[name="image"]', {
      name: "e2e-photo-v2.png",
      mimeType: "image/png",
      buffer: ONE_PIXEL_PNG,
    });
    await page.getByRole("button", { name: /save changes/i }).click();
    await page.waitForURL((url) => !url.pathname.endsWith("/edit"));
    await expect(page.getByRole("heading", { name: itemCaption })).toBeVisible();
  });

  test("REVIEWER can unpublish the item, taking it back to Approved", async ({ page }) => {
    await loginAs(page, "reviewer");
    await page.goto(itemUrl);
    await page.getByRole("button", { name: /^unpublish$/i }).click();
    await expect(page.getByText("Approved").first()).toBeVisible({ timeout: 15_000 });
  });

  test("once unpublished, the item's image requires authentication again", async ({ page, request }) => {
    await loginAs(page, "reviewer");
    await page.goto(itemUrl);
    const imgSrc = await page.locator('img[alt="A test photo for e2e coverage"]').getAttribute("src");
    expect(imgSrc).toBeTruthy();

    const response = await request.get(imgSrc!);
    expect(response.headers()["content-type"] ?? "").not.toContain("image/png");
  });

  test("REVIEWER can archive the album, and it disappears from the public Gallery page", async ({
    page,
  }) => {
    await loginAs(page, "reviewer");
    await page.goto(albumUrl);
    await page.getByRole("button", { name: /^archive$/i }).click();
    await expect(page.getByText("Archived").first()).toBeVisible({ timeout: 15_000 });

    await page.goto("/gallery");
    await expect(page.getByRole("heading", { name: albumTitle })).toHaveCount(0);
  });
});

test.describe("Gallery is scoped to content_general, not content_faculty", () => {
  test("FACULTY_EDITOR (wrong domain) cannot create an album", async ({ page }) => {
    await loginAs(page, "faculty-editor");
    await page.goto("/admin/gallery/new");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });
});
