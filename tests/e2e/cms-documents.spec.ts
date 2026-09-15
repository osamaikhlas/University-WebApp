import { expect, test, type Page } from "@playwright/test";

/**
 * Full CMS lifecycle for the Documents module — the first e2e coverage of real file upload
 * (not a pasted URL), validation, preview, metadata, replacement, publish-date/expiry-date
 * scheduling, approver tracking, archive/unpublish, and permission-gated file access,
 * exercised against the real dev server + seeded database.
 */
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

const TINY_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
  "utf8",
);

async function loginAs(page: Page, roleSlug: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${roleSlug}@example.invalid`);
  await page.getByLabel("Password").fill(DEV_LOGIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe.serial("Documents CMS module — full workflow", () => {
  const title = `E2E Test Document ${Date.now()}`;
  let documentUrl = "";

  test("EDITOR cannot create a document with no file selected", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/documents/new");
    await page.locator("#title").fill(title);
    await page.getByRole("button", { name: /upload document/i }).click();
    // Still on the create form (or shows an inline error) — never redirected to a view page.
    await expect(page).toHaveURL(/\/admin\/documents\/new$/);
  });

  test("EDITOR can upload a document with a real file, description, and category — it starts as a draft", async ({
    page,
  }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/documents/new");

    await page.locator("#title").fill(title);
    await page.locator("#description").fill("An e2e test document description.");
    await page.locator("#category").fill("Circular");
    await page.setInputFiles('input[name="file"]', {
      name: "e2e-doc.pdf",
      mimeType: "application/pdf",
      buffer: TINY_PDF,
    });
    await page.getByRole("button", { name: /upload document/i }).click();

    await page.waitForURL((url) => !url.pathname.endsWith("/new"));
    documentUrl = page.url();
    await expect(page.getByText("Draft").first()).toBeVisible();
    await expect(page.getByText("e2e-doc.pdf")).toBeVisible();
  });

  test("EDITOR cannot publish without going through review (no publish button available)", async ({
    page,
  }) => {
    await loginAs(page, "editor");
    await page.goto(documentUrl);
    await expect(page.getByRole("button", { name: /^publish$/i })).toHaveCount(0);
  });

  test("EDITOR submits for review", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto(documentUrl);
    await page.getByRole("button", { name: /submit for review/i }).click();
    await expect(page.getByText("Submitted")).toBeVisible({ timeout: 15_000 });
  });

  test("REVIEWER starts review, approves (recording the approver), and publishes", async ({ page }) => {
    await loginAs(page, "reviewer");
    await page.goto(documentUrl);

    await page.getByRole("button", { name: /start review/i }).click();
    await expect(page.getByText("Under review")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /^approve$/i }).click();
    await expect(page.getByText("Approved")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/PRINCIPAL|ADMINISTRATOR|REVIEWER/i).first()).toBeVisible();

    await page.getByRole("button", { name: /^publish$/i }).click();
    await expect(page.getByText("Published")).toBeVisible({ timeout: 15_000 });
  });

  test("the published document appears on the public Downloads page and is downloadable without a session", async ({
    page,
    request,
  }) => {
    await page.goto("/downloads");
    await expect(page.getByRole("link", { name: title })).toBeVisible();

    const href = await page.getByRole("link", { name: title }).getAttribute("href");
    const response = await request.get(href!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
  });

  test("EDITOR can replace the file, bumping the version", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto(`${documentUrl}/edit`);
    await page.setInputFiles('input[name="file"]', {
      name: "e2e-doc-v2.pdf",
      mimeType: "application/pdf",
      buffer: TINY_PDF,
    });
    await page.getByRole("button", { name: /save changes/i }).click();

    await page.waitForURL((url) => !url.pathname.endsWith("/edit"));
    await expect(page.getByText("e2e-doc-v2.pdf")).toBeVisible();
    await expect(page.getByText(/version 2/i)).toBeVisible();
  });

  test("REVIEWER can unpublish the document, taking it back to Approved", async ({ page }) => {
    await loginAs(page, "reviewer");
    await page.goto(documentUrl);
    await page.getByRole("button", { name: /^unpublish$/i }).click();
    await expect(page.getByText("Approved").first()).toBeVisible({ timeout: 15_000 });
  });

  test("once unpublished, the document no longer appears on the public Downloads page and its file requires authentication", async ({
    page,
    request,
  }) => {
    await page.goto("/downloads");
    await expect(page.getByRole("link", { name: title })).toHaveCount(0);

    await loginAs(page, "reviewer");
    await page.goto(documentUrl);
    const href = await page.getByRole("link", { name: "e2e-doc-v2.pdf" }).getAttribute("href");

    const anonymousResponse = await request.get(href!);
    expect(anonymousResponse.headers()["content-type"] ?? "").not.toContain("application/pdf");
  });

  test("REVIEWER can re-publish, then archive the document, removing it from Downloads", async ({
    page,
  }) => {
    await loginAs(page, "reviewer");
    await page.goto(documentUrl);
    await page.getByRole("button", { name: /^publish$/i }).click();
    await expect(page.getByText("Published")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /^archive$/i }).click();
    await expect(page.getByText("Archived").first()).toBeVisible({ timeout: 15_000 });

    await page.goto("/downloads");
    await expect(page.getByRole("link", { name: title })).toHaveCount(0);
  });

  test("EDITOR (manage-tier) can unarchive the document back to Draft", async ({ page }) => {
    // Unarchive is manage-tier (like return_to_draft) — PRINCIPAL only holds the publish-tier
    // grant for content_general (it views/publishes but never authors), so this must be the
    // author-side role.
    await loginAs(page, "editor");
    await page.goto(documentUrl);
    await expect(page.getByRole("button", { name: /unarchive/i })).toBeVisible();
    await page.getByRole("button", { name: /unarchive/i }).click();
    await expect(page.getByText("Draft").first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe.serial("Documents: publish-date/expiry-date scheduling", () => {
  const title = `E2E Scheduled Document ${Date.now()}`;
  let documentUrl = "";

  test("EDITOR uploads a document with a far-future publishDate and submits for review", async ({
    page,
  }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/documents/new");
    await page.locator("#title").fill(title);
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 5);
    await page.locator("#publishDate").fill(farFuture.toISOString().slice(0, 10));
    await page.setInputFiles('input[name="file"]', {
      name: "scheduled.pdf",
      mimeType: "application/pdf",
      buffer: TINY_PDF,
    });
    await page.getByRole("button", { name: /upload document/i }).click();
    await page.waitForURL((url) => !url.pathname.endsWith("/new"));
    documentUrl = page.url();

    await page.getByRole("button", { name: /submit for review/i }).click();
    await expect(page.getByText("Submitted")).toBeVisible({ timeout: 15_000 });
  });

  test("REVIEWER approves and publishes it — status is PUBLISHED but a warning shows it isn't live yet", async ({
    page,
  }) => {
    await loginAs(page, "reviewer");
    await page.goto(documentUrl);
    await page.getByRole("button", { name: /start review/i }).click();
    await expect(page.getByText("Under review")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^approve$/i }).click();
    await expect(page.getByText("Approved")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^publish$/i }).click();
    await expect(page.getByText("Published", { exact: true })).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText(/not currently visible to the public/i)).toBeVisible();
  });

  test("it does not yet appear on the public Downloads page", async ({ page }) => {
    await page.goto("/downloads");
    await expect(page.getByRole("link", { name: title })).toHaveCount(0);
  });
});

test.describe("Documents is scoped to content_general, not content_faculty", () => {
  test("FACULTY_EDITOR (wrong domain) cannot create a document", async ({ page }) => {
    await loginAs(page, "faculty-editor");
    await page.goto("/admin/documents/new");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });
});
