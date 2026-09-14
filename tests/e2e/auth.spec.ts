import { expect, test, type Page } from "@playwright/test";

/**
 * Exercises the real login/logout/session flow against the seeded [DEV SEED] test accounts
 * (prisma/seed.ts — one account per required role, never seeded when NODE_ENV=production).
 * Requires the dev database to have been seeded (`npm run db:seed`) before this suite runs.
 */
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

function emailFor(roleSlug: string): string {
  return `${roleSlug}@example.invalid`;
}

async function loginAs(page: Page, roleSlug: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(emailFor(roleSlug));
  await page.getByLabel("Password").fill(DEV_LOGIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe("unauthenticated access", () => {
  test("visiting /admin without a session redirects to /login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("wrong password shows a generic error and does not sign in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(emailFor("editor"));
    await page.getByLabel("Password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("authorized access", () => {
  test("a valid super-admin login reaches the dashboard and shows the signed-in identity", async ({
    page,
  }) => {
    await loginAs(page, "super-admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText(/signed in as/i)).toContainText("SUPER_ADMIN");
  });

  test("logging out ends the session server-side (subsequent /admin visit redirects again)", async ({
    page,
  }) => {
    await loginAs(page, "editor");
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("unauthorized access (authenticated but insufficient permission)", () => {
  test("EDITOR is redirected to /admin/unauthorized when visiting /admin/users", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
    await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
  });

  test("ADMISSION_OFFICER is redirected to /admin/unauthorized when visiting /admin/exams", async ({
    page,
  }) => {
    await loginAs(page, "admission-officer");
    await page.goto("/admin/exams");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });
});

test.describe("role-specific access", () => {
  test("EDITOR can reach /admin/notices but not /admin/admissions", async ({ page }) => {
    await loginAs(page, "editor");

    await page.goto("/admin/notices");
    await expect(page).toHaveURL(/\/admin\/notices$/);
    await expect(page.getByRole("heading", { name: "Notices" })).toBeVisible();

    await page.goto("/admin/admissions");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });

  test("ADMISSION_OFFICER can reach /admin/admissions but not /admin/faculty", async ({ page }) => {
    await loginAs(page, "admission-officer");

    await page.goto("/admin/admissions");
    await expect(page).toHaveURL(/\/admin\/admissions$/);

    await page.goto("/admin/faculty");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });

  test("EXAMINATION_OFFICER can reach /admin/exams but not /admin/admissions", async ({ page }) => {
    await loginAs(page, "examination-officer");

    await page.goto("/admin/exams");
    await expect(page).toHaveURL(/\/admin\/exams$/);

    await page.goto("/admin/admissions");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });

  test("FACULTY_EDITOR can reach /admin/faculty but not /admin/users", async ({ page }) => {
    await loginAs(page, "faculty-editor");

    await page.goto("/admin/faculty");
    await expect(page).toHaveURL(/\/admin\/faculty$/);

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });

  test("only PRINCIPAL/ADMINISTRATOR/SUPER_ADMIN can reach /admin/grievances", async ({ page }) => {
    await loginAs(page, "principal");
    await page.goto("/admin/grievances");
    await expect(page).toHaveURL(/\/admin\/grievances$/);
  });

  test("REVIEWER cannot reach /admin/grievances", async ({ page }) => {
    await loginAs(page, "reviewer");
    await page.goto("/admin/grievances");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });
});
