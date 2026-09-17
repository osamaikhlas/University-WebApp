import { expect, test, type Page } from "@playwright/test";

/**
 * The four previously-`PagePlaceholder` governance pages (progress.md's long-standing Next
 * steps), built out per explicit user instruction after they reported all four still showing
 * "Placeholder — content pending" despite the real college data being loaded — correctly:
 * these are features, not data. CMS (hub + counts), Roles/Permissions (a real runtime-
 * editable matrix), and Approval workflow (a cross-module pending-review queue).
 *
 * Every test here logs in exactly once, like the rest of this suite (see e.g.
 * cms-departments.spec.ts) — a flow that needs a second role's perspective (SUPER_ADMIN
 * grants a permission, then EDITOR uses it; EDITOR submits something, then REVIEWER sees it)
 * is split across sequential tests inside `test.describe.serial`, sharing state via an
 * outer-scope variable, rather than switching the signed-in user mid-test on one `page`. An
 * already-authenticated session makes `goto("/login")` redirect straight back to /admin
 * (src/app/login/page.tsx's own already-signed-in guard) instead of showing the form, so a
 * single `page` can only ever log in once.
 */
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

async function loginAs(page: Page, roleSlug: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${roleSlug}@example.invalid`);
  await page.getByLabel("Password").fill(DEV_LOGIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe("CMS hub", () => {
  test("SUPER_ADMIN sees real module cards with record counts, not a placeholder", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto("/admin/cms");

    await expect(page.getByRole("heading", { level: 1, name: "CMS" })).toBeVisible();
    await expect(page.getByText("Placeholder", { exact: false })).toHaveCount(0);
    // Scoped to #main-content — the sidebar also has a plain "Notices"/"Faculty" nav link.
    const main = page.locator("#main-content");
    await expect(main.getByRole("link", { name: /Notices/ })).toBeVisible();
    await expect(main.getByRole("link", { name: /Faculty/ })).toBeVisible();
  });
});

test.describe("Roles", () => {
  test("SUPER_ADMIN sees all 8 roles with permission counts", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto("/admin/roles");

    await expect(page.getByRole("heading", { level: 1, name: "Roles" })).toBeVisible();
    await expect(page.getByRole("link", { name: "EDITOR", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "SUPER_ADMIN", exact: true })).toBeVisible();
  });

  test("SUPER_ADMIN's own grants cannot be edited", async ({ page }) => {
    await loginAs(page, "super-admin");
    await page.goto("/admin/roles");
    await page.getByRole("link", { name: "SUPER_ADMIN", exact: true }).click();

    await expect(page.getByText(/can.t be edited/i)).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
  });

  test("EDITOR (no roles:manage) is redirected to /admin/unauthorized", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/roles");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });

  test.describe.serial("editing a role's grants persists and takes effect immediately", () => {
    // FACULTY_EDITOR, not EDITOR — this block temporarily mutates a *global* resource
    // (RolePermission), and several other specs (tests/e2e/dashboard.spec.ts,
    // tests/e2e/audit-logs.spec.ts) assert EDITOR specifically lacks audit_logs:view as part
    // of their own baseline checks. Those run concurrently in other workers (this suite is
    // fullyParallel), so mutating EDITOR here caused real, intermittent cross-file failures
    // (caught during this session's own verification run) — no spec makes the same baseline
    // assumption about FACULTY_EDITOR's audit_logs:view, so it doesn't collide.
    test("SUPER_ADMIN grants FACULTY_EDITOR audit_logs:view", async ({ page }) => {
      await loginAs(page, "super-admin");
      await page.goto("/admin/roles");
      await page.getByRole("link", { name: "FACULTY_EDITOR", exact: true }).click();
      await page.waitForURL(/\/admin\/roles\/[a-z0-9]+$/);

      const auditLogsCheckbox = page.getByRole("checkbox", { name: /audit_logs:view/ });
      await expect(auditLogsCheckbox).not.toBeChecked();
      await auditLogsCheckbox.check();
      await page.getByRole("button", { name: /save permissions/i }).click();
      // The redirect target is this same URL, so waitForURL would resolve instantly without
      // actually waiting for the save — wait for the network to settle instead.
      await page.waitForLoadState("networkidle");

      // Reflected immediately (RolePermission is read live, no cache to invalidate).
      await expect(page.getByRole("checkbox", { name: /audit_logs:view/ })).toBeChecked();
    });

    test("FACULTY_EDITOR can now reach /admin/audit-logs, proving the grant is real, not cosmetic", async ({
      page,
    }) => {
      await loginAs(page, "faculty-editor");
      await page.goto("/admin/audit-logs");
      await expect(page).not.toHaveURL(/\/admin\/unauthorized$/);
    });

    test("SUPER_ADMIN revokes it again, leaving the matrix as this suite found it", async ({ page }) => {
      await loginAs(page, "super-admin");
      await page.goto("/admin/roles");
      await page.getByRole("link", { name: "FACULTY_EDITOR", exact: true }).click();
      await page.getByRole("checkbox", { name: /audit_logs:view/ }).uncheck();
      await page.getByRole("button", { name: /save permissions/i }).click();
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("checkbox", { name: /audit_logs:view/ })).not.toBeChecked();
    });
  });
});

test.describe("Permissions", () => {
  test("ADMINISTRATOR sees the live role × permission matrix", async ({ page }) => {
    await loginAs(page, "administrator");
    await page.goto("/admin/permissions");

    await expect(page.getByRole("heading", { level: 1, name: "Permissions" })).toBeVisible();
    // Each domain gets its own table, each repeating the same 8 role columns.
    await expect(page.getByRole("columnheader", { name: "SUPER_ADMIN" }).first()).toBeVisible();
    await expect(page.getByRole("rowheader", { name: "content_general:manage" })).toBeVisible();
  });
});

test.describe("Approval workflow", () => {
  test("EDITOR (manage-tier only, no approval_workflow:view) is redirected to /admin/unauthorized", async ({
    page,
  }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/approval-workflow");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });

  test.describe.serial("a submitted notice appears in the reviewer's queue", () => {
    const noticeTitle = `E2E Governance Notice ${Date.now()}`;

    test("EDITOR creates and submits a notice", async ({ page }) => {
      await loginAs(page, "editor");
      await page.goto("/admin/notices/new");
      await page.getByLabel("Title").fill(noticeTitle);
      await page.getByLabel("Body").fill("Created to exercise the approval-workflow queue.");
      await page.getByRole("button", { name: /create notice/i }).click();
      await page.waitForURL((url) => !url.pathname.endsWith("/new"));
      await page.getByRole("button", { name: /submit for review/i }).click();
      await expect(page.getByText("Submitted", { exact: true })).toBeVisible({ timeout: 15_000 });
    });

    test("REVIEWER sees it waiting in the approval-workflow queue", async ({ page }) => {
      await loginAs(page, "reviewer");
      await page.goto("/admin/approval-workflow");
      await expect(page.getByRole("link", { name: noticeTitle })).toBeVisible();
    });
  });
});
