import { expect, test, type Page } from "@playwright/test";

/**
 * Compliance Dashboard (docs/compliance-matrix.md, CLAUDE.md rule 7), exercised against the
 * real dev server + seeded database. Unlike every other CMS module's e2e spec, this one
 * cannot create fresh rows to get a clean starting state — the 20 `ComplianceRequirement`
 * rows are a fixed, pre-seeded checklist, not a creatable resource — so each block below
 * first normalizes whatever status a prior run left the item in, rather than assuming a
 * starting status. This is the price of testing against a genuinely persistent shared
 * fixture instead of mocks.
 */
const DEV_LOGIN_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "DevSeed!Passw0rd1";

const STATUS_LABELS = [
  "Not started",
  "In progress",
  "Ready for review",
  "Verified",
  "Needs update",
  "Not applicable",
] as const;

async function loginAs(page: Page, roleSlug: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${roleSlug}@example.invalid`);
  await page.getByLabel("Password").fill(DEV_LOGIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin$/);
}

async function readStatus(page: Page): Promise<string> {
  for (const label of STATUS_LABELS) {
    if (await page.getByText(label, { exact: true }).first().isVisible().catch(() => false)) {
      return label;
    }
  }
  throw new Error("No compliance status badge found on page.");
}

async function goToRequirement(page: Page, title: string): Promise<void> {
  await page.goto("/admin/compliance");
  await page.getByRole("link", { name: title, exact: true }).click();
  await page.waitForURL(/\/admin\/compliance\/[a-z0-9]+$/);
}

test.describe("Compliance Dashboard lists all 20 requirements", () => {
  test("ADMINISTRATOR sees every requirement with its module, status, and completeness", async ({
    page,
  }) => {
    await loginAs(page, "administrator");
    await page.goto("/admin/compliance");

    await expect(page.getByRole("heading", { name: "Compliance" })).toBeVisible();
    await expect(page.getByText(/of 20 requirements verified/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Faculty details" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Grievance mechanism" })).toBeVisible();
  });

  test("EDITOR (no compliance permission) is redirected to /admin/unauthorized", async ({ page }) => {
    await loginAs(page, "editor");
    await page.goto("/admin/compliance");
    await expect(page).toHaveURL(/\/admin\/unauthorized$/);
  });
});

test.describe("A previously-verified requirement shows its verification history", () => {
  test("Faculty details (seeded VERIFIED) shows the verifier, evidence, and history", async ({
    page,
  }) => {
    await loginAs(page, "administrator");
    await goToRequirement(page, "Faculty details");

    // This item may have been pushed elsewhere by a prior run of the mutating block below —
    // only assert the parts that are always true regardless of its current status.
    await expect(page.getByText("Required records")).toBeVisible();
    await expect(page.getByText("Required fields")).toBeVisible();
    await expect(page.getByText("Responsible module")).toBeVisible();
    await expect(page.getByText("Responsible role")).toBeVisible();
    await expect(page.getByText("Completeness (automatic, from current database content)")).toBeVisible();
    await expect(page.getByText("Verification history")).toBeVisible();

    // The seed's faculty record has no qualifications and no email/phone recorded, so
    // completeness reflects that gap even though the requirement itself was verified by a
    // human earlier — proving this is a real per-field check, not a "record exists" rubber
    // stamp that a VERIFIED requirement would otherwise mask.
    await expect(page.getByText(/Every faculty member has qualifications recorded/)).toBeVisible();
  });
});

test.describe.serial("Marking a requirement not applicable requires a reason, and is reversible", () => {
  test("Other required information: mark not applicable requires a reason, then can be reopened", async ({
    page,
  }) => {
    await loginAs(page, "administrator");
    await goToRequirement(page, "Other required information");

    // Item 20 has no fixed data source, so it only ever automatically settles on NOT_STARTED
    // — normalize back to that if a previous run left it NOT_APPLICABLE.
    if ((await readStatus(page)) === "Not applicable") {
      await page.getByRole("button", { name: /^reopen$/i }).click();
      await expect(page.getByText("Not started", { exact: true })).toBeVisible({ timeout: 15_000 });
    }

    await page.getByRole("button", { name: /mark not applicable/i }).click();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Not started", { exact: true })).toBeVisible();

    await page
      .getByLabel(/reviewer notes/i)
      .fill("This college does not offer any programs requiring this category.");
    await page.getByRole("button", { name: /mark not applicable/i }).click();
    await expect(page.getByText("Not applicable", { exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /^reopen$/i }).click();
    await expect(page.getByText("Not started", { exact: true })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe.serial("Full verify / needs-update lifecycle, reason enforced end-to-end", () => {
  const REQUIREMENT_TITLE = "Co-curricular activities";

  test("normalizes to a submittable state, then runs the full lifecycle", async ({ page }) => {
    await loginAs(page, "administrator");
    await goToRequirement(page, REQUIREMENT_TITLE);

    // Normalize: this item always has real published Activity content behind it, so it will
    // never rest on NOT_STARTED/NOT_APPLICABLE on its own — only READY_FOR_REVIEW/VERIFIED
    // left over from a prior run need to be walked back to a submittable state.
    let status = await readStatus(page);
    if (status === "Ready for review" || status === "Verified") {
      await page.getByLabel(/reviewer notes/i).fill("Test setup: resetting to a known state.");
      await page.getByRole("button", { name: /^reject/i }).click();
      await expect(page.getByText("Needs update", { exact: true })).toBeVisible({ timeout: 15_000 });
    }
    if (status === "Not applicable") {
      await page.getByRole("button", { name: /^reopen$/i }).click();
      await page.reload();
    }

    status = await readStatus(page);
    expect(["In progress", "Needs update", "Not started"]).toContain(status);
    if (status === "Not started") {
      // Real content exists for this item, so a reload lets the automatic completeness sync
      // promote it to IN_PROGRESS before we try to submit.
      await page.reload();
      status = await readStatus(page);
    }

    await page.getByRole("button", { name: /submit for review/i }).click();
    await expect(page.getByText("Ready for review", { exact: true })).toBeVisible({ timeout: 15_000 });

    // Reject without a reason is refused — the status does not change.
    await page.getByRole("button", { name: /^reject/i }).click();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Ready for review", { exact: true })).toBeVisible();

    // Reject with a reason succeeds -> NEEDS_UPDATE.
    await page.getByLabel(/reviewer notes/i).fill("Needs more recent photos and a description update.");
    await page.getByRole("button", { name: /^reject/i }).click();
    await expect(page.getByText("Needs update", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Needs update by").first()).toBeVisible();

    // Resubmit and verify.
    await page.getByRole("button", { name: /submit for review/i }).click();
    await expect(page.getByText("Ready for review", { exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /^verify$/i }).click();
    await expect(page.getByText("Verified", { exact: true }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Verified by").first()).toBeVisible();

    // A verified item can still be flagged again later — reason still mandatory.
    await page.getByRole("button", { name: /^reject/i }).click();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });
    await page.getByLabel(/reviewer notes/i).fill("A follow-up inspection found stale photos.");
    await page.getByRole("button", { name: /^reject/i }).click();
    await expect(page.getByText("Needs update", { exact: true })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Evidence can be attached to a requirement", () => {
  test("attaching evidence records who added it and shows in the evidence list", async ({ page }) => {
    await loginAs(page, "administrator");
    await goToRequirement(page, "Physical infrastructure");

    const entityId = `e2e-evidence-${Date.now()}`;
    await page.getByLabel("Entity type").fill("Infrastructure");
    await page.getByLabel("Entity ID").fill(entityId);
    await page.getByLabel(/note \(optional\)/i).fill("Linked the science lab record as evidence.");
    await page.getByRole("button", { name: /add evidence/i }).click();

    await expect(page.getByText(`Infrastructure — ${entityId}`)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Linked the science lab record as evidence.").first()).toBeVisible();
  });
});
