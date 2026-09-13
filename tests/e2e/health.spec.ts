import { expect, test } from "@playwright/test";

test("health-check endpoint responds with a status payload", async ({ request }) => {
  const response = await request.get("/api/health");

  // 200 when the database is reachable, 503 when degraded — either is a valid response
  // shape; what must never happen is the route crashing (5xx with no body / non-JSON).
  expect([200, 503]).toContain(response.status());

  const body = await response.json();
  expect(body).toHaveProperty("status");
  expect(body).toHaveProperty("checks.database");
});
