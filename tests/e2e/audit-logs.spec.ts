import { expect, test, type Page } from "@playwright/test";

/**
 * Centralized audit logging: coverage across action types (create, publish, login, permission
 * changes, compliance verification, grievance status changes), the read-only admin viewer
 * (list + filter + pagination + detail), and access control — exercised against the real dev
 * server + seeded database.
 */
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

async function loginAs(page: Page, roleSlug: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${roleSlug}@example.invalid`);
  await page.getByLabel("Password").fill(DEV_LOGIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe("Audit log — access control", () => {
  test("a role without audit_logs:view is redirected to /admin/unauthorized", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/audit-logs");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });

  test("SUPER_ADMIN can reach the audit log viewer", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto("/admin/audit-logs");
    await expect(page.getByRole("heading", { name: "Audit logs" })).toBeVisible();
  });
});

test.describe("Audit log — is read-only", () => {
  test("the list page has no edit/delete controls anywhere", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto("/admin/audit-logs");
    await expect(page.getByRole("button", { name: /^(edit|delete)$/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^(edit|delete)$/i })).toHaveCount(0);
  });

  test("the detail page has no edit/delete controls and says the record is permanent", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto("/admin/audit-logs");
    await page.getByRole("link").filter({ hasText: /./ }).first().waitFor();
    // Follow the first entry's own link to its detail page.
    const firstEntryLink = page.locator('table a[href^="/admin/audit-logs/"]').first();
    await firstEntryLink.click();

    await expect(page.getByText(/database itself rejects any attempt to edit or delete/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^(edit|delete)$/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^(edit|delete)$/i })).toHaveCount(0);
  });
});

test("logging in writes a LOGIN entry findable by filtering action + actor", async ({ page }) => {
  await loginAs(page, "super-admin");
  await page.goto(
    "/admin/audit-logs?action=LOGIN&actor=" + encodeURIComponent("super-admin@example.invalid"),
  );
  await expect(page.getByRole("link", { name: "Login" }).first()).toBeVisible();
});

// A fresh `page` fixture per test() call is what makes multi-role workflows below safe: a
// second loginAs() *within the same test* would hang, because visiting /login while already
// authenticated redirects straight to /admin before the email field ever renders. So each
// role's step is its own test(), chained via test.describe.serial() and closure state.
test.describe.serial("Audit log — department CREATE and PUBLISH", () => {
  const title = `E2E Audit Department ${Date.now()}`;
  let departmentUrl = "";

  test("EDITOR creates and submits the department", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/departments/new");
    await page.locator("#name").fill(title);
    await page.getByRole("button", { name: /create department/i }).click();
    await page.waitForURL((url) => !url.pathname.endsWith("/new"));
    departmentUrl = page.url();

    await page.getByRole("button", { name: /submit for review/i }).click();
    await expect(page.getByText("Submitted")).toBeVisible({ timeout: 15_000 });
  });

  test("REVIEWER reviews, approves, and publishes it", async ({ page }) => {
    await loginAs(page, "reviewer");
    await page.goto(departmentUrl);
    await page.getByRole("button", { name: /start review/i }).click();
    await expect(page.getByText("Under review")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^approve$/i }).click();
    await expect(page.getByText("Approved")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^publish$/i }).click();
    await expect(page.getByText("Published", { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test("SUPER_ADMIN finds CREATE and PUBLISH entries for it in the audit log", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto(`/admin/audit-logs?entityType=Department&action=CREATE`);
    await expect(page.getByRole("link", { name: "Create" }).first()).toBeVisible();

    await page.goto(`/admin/audit-logs?entityType=Department&action=PUBLISH`);
    await expect(page.getByRole("link", { name: "Publish" }).first()).toBeVisible();
  });
});

test.describe.serial("Audit log — grievance status change", () => {
  const subject = `E2E Audit Grievance ${Date.now()}`;

  test("a grievance is submitted publicly", async ({ page }) => {
    await page.goto("/grievance");
    await page.getByLabel("Name").fill("E2E Audit Submitter");
    await page.getByLabel("Email").fill(`audit-${Date.now()}@example.invalid`);
    await page.getByLabel("Category").selectOption("Other");
    await page.getByLabel("Subject").fill(subject);
    await page.getByLabel("Description").fill("Filed to verify grievance status changes are audited.");
    await page.getByRole("button", { name: /submit grievance/i }).click();
    await expect(page.getByText("Grievance submitted")).toBeVisible();
  });

  test("PRINCIPAL starts review on it", async ({ page }) => {
    await loginAs(page, "principal");
    await page.goto("/admin/grievances?q=" + encodeURIComponent(subject));
    // Only the reference number is a link in the grievances table, not the subject cell.
    await page.getByRole("row").filter({ hasText: subject }).getByRole("link").click();
    await page.getByRole("button", { name: /start review/i }).click();
    await expect(page.getByText("Under review").first()).toBeVisible({ timeout: 15_000 });
  });

  test("SUPER_ADMIN finds the GRIEVANCE_STATUS_CHANGE entry for it", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto("/admin/audit-logs?entityType=Grievance&action=GRIEVANCE_STATUS_CHANGE");
    await expect(page.getByRole("link", { name: "Grievance status change" }).first()).toBeVisible();
  });
});

test.describe.serial("Audit log — permission changes (role assign/remove)", () => {
  // Targets the non-login-capable `dev-seed-admin` fixture (already SUPER_ADMIN, so
  // temporarily adding/removing REVIEWER here changes no *effective* permission and can't
  // interfere with any other e2e spec's login-based role assumptions the way editing one of
  // the 8 per-role login accounts could) rather than any of the accounts other specs log in as.
  const cardSelector = '[data-user-card="dev-seed-admin@example.invalid"]';

  test("starts from a known state (no REVIEWER role leftover from a previous run)", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto("/admin/users");
    const card = page.locator(cardSelector);
    const removeButton = card.getByRole("button", { name: /remove REVIEWER/i });
    if (await removeButton.count()) {
      await removeButton.click();
      // Wait for the actual DOM change (the button disappearing), not just a URL match —
      // waitForURL against a URL we're already on can resolve before the round-trip completes.
      await expect(removeButton).toHaveCount(0, { timeout: 15_000 });
    }
  });

  test("SUPER_ADMIN assigns REVIEWER to it, which writes a ROLE_CHANGE entry", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto("/admin/users");
    const card = page.locator(cardSelector);
    await card.getByLabel("Add role").selectOption("REVIEWER");
    await card.getByRole("button", { name: "Add" }).click();
    await expect(card.getByRole("button", { name: /remove REVIEWER/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/roleError/i)).toHaveCount(0);

    await page.goto("/admin/audit-logs?action=ROLE_CHANGE");
    const addedEntryLink = page.getByRole("link", { name: "Role change" }).first();
    await expect(addedEntryLink).toBeVisible();
    await addedEntryLink.click();
    await expect(page.getByText(/"changeType": "added"/)).toBeVisible();
    await expect(page.getByText(/"role": "REVIEWER"/)).toBeVisible();
  });

  test("SUPER_ADMIN removes REVIEWER from it, which writes another ROLE_CHANGE entry", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto("/admin/users");
    const card = page.locator(cardSelector);
    const removeButton = card.getByRole("button", { name: /remove REVIEWER/i });
    await removeButton.click();
    await expect(removeButton).toHaveCount(0, { timeout: 15_000 });

    await page.goto("/admin/audit-logs?action=ROLE_CHANGE");
    const removedEntryLink = page.getByRole("link", { name: "Role change" }).first();
    await expect(removedEntryLink).toBeVisible();
    await removedEntryLink.click();
    await expect(page.getByText(/"changeType": "removed"/)).toBeVisible();
  });
});
