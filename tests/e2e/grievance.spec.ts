import { expect, test, type Page } from "@playwright/test";

/**
 * Full grievance system workflow against the real dev server + seeded database: public
 * submission (with an attachment), reference-number lookup, decrypted contact details visible
 * only to authorized staff, the complete NEW -> ... -> CLOSED -> reopen status lifecycle,
 * assignment, internal notes, responses, audit history, search/filter, and access control
 * (an unauthorized role and an unauthenticated attachment fetch are both refused).
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

test.describe.serial("Grievance system — full workflow", () => {
  const subject = `E2E Test Grievance ${Date.now()}`;
  const submitterEmail = `e2e-submitter-${Date.now()}@example.invalid`;
  let referenceNumber = "";
  let detailUrl = "";

  test("a member of the public can submit a grievance with an attachment and gets a reference number", async ({
    page,
  }) => {
    await page.goto("/grievance");

    await page.getByLabel("Name").fill("E2E Test Submitter");
    await page.getByLabel("Email").fill(submitterEmail);
    await page.getByLabel(/phone/i).fill("+92-300-1234567");
    await page.getByLabel("Category").selectOption("Facilities");
    await page.getByLabel("Subject").fill(subject);
    await page.getByLabel("Description").fill("The library roof has been leaking for two weeks.");
    await page.setInputFiles('input[name="attachment"]', {
      name: "evidence.png",
      mimeType: "image/png",
      buffer: ONE_PIXEL_PNG,
    });

    await page.getByRole("button", { name: /submit grievance/i }).click();

    await expect(page.getByText("Grievance submitted")).toBeVisible();
    const referenceLocator = page.getByText(/^GRV-\d{8}-[A-Z0-9]{6}$/);
    await expect(referenceLocator).toBeVisible();
    referenceNumber = (await referenceLocator.textContent())!.trim();
    expect(referenceNumber).toMatch(/^GRV-\d{8}-[A-Z0-9]{6}$/);
  });

  test("the grievance is not reachable through any public page or API", async ({ page, request }) => {
    // No public listing/search exposes grievance content anywhere on the site — the search
    // page's own "no results for ..." empty state legitimately echoes the query text, so
    // assert on that empty state rather than the subject's mere absence.
    await page.goto(`/search?q=${encodeURIComponent(subject)}`);
    await expect(page.getByText(/no published results found/i)).toBeVisible();

    const sitemap = await request.get("/sitemap.xml");
    const sitemapBody = await sitemap.text();
    expect(sitemapBody).not.toContain(referenceNumber);
  });

  test("PRINCIPAL can find the grievance via search and see decrypted contact details", async ({ page }) => {
    await loginAs(page, "principal");
    await page.goto("/admin/grievances");

    await page.getByLabel("Search", { exact: true }).fill(referenceNumber);
    await page.getByRole("button", { name: /^filter$/i }).click();

    await expect(page.getByRole("link", { name: referenceNumber })).toBeVisible();
    await page.getByRole("link", { name: referenceNumber }).click();

    await expect(page.getByRole("heading", { name: subject })).toBeVisible();
    detailUrl = page.url();

    await expect(page.getByText(submitterEmail)).toBeVisible();
    await expect(page.getByText("+92-300-1234567")).toBeVisible();
    await expect(page.getByText("evidence.png")).toBeVisible();
    await expect(page.getByText("New")).toBeVisible();
  });

  test("a role without the grievances permission is refused, even by direct navigation", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto(detailUrl);
    await page.waitForURL(/\/admin\/unauthorized$/);
    await expect(page.getByText("Access denied")).toBeVisible();
  });

  test("the attachment download requires authentication", async ({ page, request }) => {
    await loginAs(page, "principal");
    await page.goto(detailUrl);
    const downloadHref = await page.getByRole("link", { name: "evidence.png" }).getAttribute("href");
    expect(downloadHref).toBeTruthy();

    // The top-level `request` fixture is its own APIRequestContext with no cookies from the
    // logged-in `page` — an unauthenticated caller must never get the file bytes back,
    // whatever status code `requirePermission`'s redirect ends up producing.
    const anonymousResponse = await request.get(downloadHref!);
    const contentType = anonymousResponse.headers()["content-type"] ?? "";
    expect(contentType).not.toContain("image/png");
  });

  test("PRINCIPAL can assign the grievance to a staff member, moving it to ASSIGNED", async ({ page }) => {
    await loginAs(page, "principal");
    await page.goto(detailUrl);
    await page
      .getByLabel("Staff member")
      .selectOption({ label: "[DEV SEED] PRINCIPAL Test Account (principal@example.invalid)" });
    await page.getByRole("button", { name: /^assign$/i }).click();

    // Exact match: a plain substring match here would also match the "Unassigned" fallback
    // text shown before any assignment exists, silently passing even if the assignment
    // itself failed.
    await expect(page.getByText("Assigned", { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("PRINCIPAL can start review, moving it to UNDER_REVIEW", async ({ page }) => {
    await loginAs(page, "principal");
    await page.goto(detailUrl);
    await page.getByRole("button", { name: /start review/i }).click();

    await expect(page.getByText("Under review").first()).toBeVisible({ timeout: 15_000 });
  });

  test("PRINCIPAL can add an internal note", async ({ page }) => {
    await loginAs(page, "principal");
    await page.goto(detailUrl);
    await page.getByPlaceholder("Add an internal note…").fill("Contacted facilities management.");
    await page.getByRole("button", { name: /add note/i }).click();

    await expect(page.getByText("Contacted facilities management.")).toBeVisible({ timeout: 15_000 });
  });

  test("PRINCIPAL can record a response to the submitter", async ({ page }) => {
    await loginAs(page, "principal");
    await page.goto(detailUrl);
    await page
      .getByPlaceholder("Record the response given to the submitter…")
      .fill("We have dispatched a maintenance crew to inspect the roof.");
    await page.getByRole("button", { name: /record response/i }).click();

    await expect(page.getByText("We have dispatched a maintenance crew to inspect the roof.")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("marking action required without a reason is refused", async ({ page }) => {
    await loginAs(page, "principal");
    await page.goto(detailUrl);
    await page.getByRole("button", { name: /mark action required/i }).click();
    await expect(page.getByText(/requires a reason/i)).toBeVisible({ timeout: 15_000 });
  });

  test("PRINCIPAL can mark action required with a reason, then resume review", async ({ page }) => {
    await loginAs(page, "principal");
    await page.goto(detailUrl);
    await page.locator("#grievance-comment-" + detailUrl.split("/").pop()).fill("Waiting on facilities team ETA.");
    await page.getByRole("button", { name: /mark action required/i }).click();
    await expect(page.getByText("Action required").first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /resume review/i }).click();
    await expect(page.getByText("Under review").first()).toBeVisible({ timeout: 15_000 });
  });

  test("PRINCIPAL can resolve and then close the grievance", async ({ page }) => {
    await loginAs(page, "principal");
    await page.goto(detailUrl);
    await page
      .locator("#grievance-comment-" + detailUrl.split("/").pop())
      .fill("Roof repaired and verified on site.");
    // "Resolve" requires a reason, so its button label is "Resolve *" — no anchors.
    await page.getByRole("button", { name: /^resolve/i }).click();
    await expect(page.getByText("Resolved").first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /^close$/i }).click();
    await expect(page.getByText("Closed").first()).toBeVisible({ timeout: 15_000 });
  });

  test("closing without reopening blocks reassignment, and reopening with a reason restores UNDER_REVIEW", async ({
    page,
  }) => {
    await loginAs(page, "principal");
    await page.goto(detailUrl);
    await expect(page.getByText(/reopen this grievance to change its assignment/i)).toBeVisible();

    await page
      .locator("#grievance-comment-" + detailUrl.split("/").pop())
      .fill("Submitter reports the leak has returned.");
    // "Reopen" requires a reason, so its button label is "Reopen *" — no anchors.
    await page.getByRole("button", { name: /^reopen/i }).click();

    await expect(page.getByText("Under review").first()).toBeVisible({ timeout: 15_000 });
  });

  test("the full audit history is visible and in order", async ({ page }) => {
    await loginAs(page, "principal");
    await page.goto(detailUrl);
    const history = page.getByRole("heading", { name: "Audit history" }).locator("..");
    // Generous timeouts: under a full parallel e2e run (many other spec files' workers
    // hitting the same dev server + database concurrently), this page's several joined
    // queries can occasionally take longer than the default 5s to render.
    await expect(history.getByText("Submitted")).toBeVisible({ timeout: 15_000 });
    await expect(history.getByText("Assigned")).toBeVisible({ timeout: 15_000 });
    await expect(history.getByText(/status changed/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(history.getByText(/internal note added/i)).toBeVisible({ timeout: 15_000 });
    await expect(history.getByText(/response recorded/i)).toBeVisible({ timeout: 15_000 });
  });

  test("filtering the list by status finds the case, and a mismatched status filter does not", async ({
    page,
  }) => {
    await loginAs(page, "principal");
    await page.goto("/admin/grievances?status=UNDER_REVIEW");
    await expect(page.getByRole("link", { name: referenceNumber })).toBeVisible();

    await page.goto("/admin/grievances?status=CLOSED");
    await expect(page.getByRole("link", { name: referenceNumber })).toHaveCount(0);
  });
});

test.describe("Grievance submission — abuse protection", () => {
  test("the honeypot field is present but hidden from a real user", async ({ page }) => {
    await page.goto("/grievance");
    const honeypot = page.locator('input[name="website"]');
    await expect(honeypot).toBeHidden();
  });

  test("rejects a submission missing required fields", async ({ page }) => {
    await page.goto("/grievance");
    await page.getByLabel("Description").fill("Short description that is long enough to pass length checks.");
    await page.getByRole("button", { name: /submit grievance/i }).click();
    // Required-field browser validation keeps the form from submitting at all — still on
    // the form, not the success state.
    await expect(page.getByRole("button", { name: /submit grievance/i })).toBeVisible();
  });
});
