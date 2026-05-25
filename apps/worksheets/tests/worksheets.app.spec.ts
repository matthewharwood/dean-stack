// ASK-FIRST decisions:
//   1. Level: app (real prerendered HTML + SPA hydration, exercises the
//      router params + generateWorksheet end-to-end).
//   2. Assertion: home page lists 15 stage cards; worksheet route renders
//      the header + 12 problems + Print button; answer route renders the
//      answer key with 12 entries; back-link returns to home.
//   3. Selector: getByRole + data-test (stage-grid, worksheet-page,
//      answer-key-page, answer-key-list, stage-link-* for navigation).
//   4. IDB: fresh (default fixture).
//   5. Network: online.
//   6. Reduced motion: forced (project default).

import { expect, test } from "./fixtures";

test("home page lists 15 stages with 3 variant links each", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("stage-grid")).toBeVisible();
  // 15 stages × 3 variants = 45 anchors.
  const variantLinks = page.locator('[data-test^="stage-link-"]');
  await expect(variantLinks).toHaveCount(45);
  await expect(page.getByRole("heading", { name: /Halid Worksheets/i })).toBeVisible();
});

test("stage worksheet route renders header, 12 problems, and Print button", async ({ page }) => {
  await page.goto("/stage/s1/A");
  await expect(page.getByTestId("worksheet-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Stage 1: Adding Up/i })).toBeVisible();
  await expect(page.locator(".problem-row")).toHaveCount(12);
  await expect(page.getByRole("button", { name: /Print \/ Save as PDF/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open answer key/i })).toBeVisible();
});

test("answer-key route renders 12 graded entries", async ({ page }) => {
  await page.goto("/answer/s1/A");
  await expect(page.getByTestId("answer-key-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Stage 1: Adding Up/i })).toBeVisible();
  const items = page.locator('[data-test="answer-key-list"] > li');
  await expect(items).toHaveCount(12);
});

test("unknown stage id renders the 404 boundary", async ({ page }) => {
  await page.goto("/stage/s99/A");
  await expect(page.getByRole("heading", { name: /404|page not found/i })).toBeVisible();
});

test("invalid variant renders the 404 boundary", async ({ page }) => {
  await page.goto("/stage/s1/Z");
  await expect(page.getByRole("heading", { name: /404|page not found/i })).toBeVisible();
});

test("home -> worksheet -> back navigation works", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("stage-link-s1-A").click();
  await expect(page).toHaveURL(/\/stage\/s1\/A$/);
  await expect(page.getByTestId("worksheet-page")).toBeVisible();
  await page.getByRole("link", { name: /All worksheets/i }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("stage-grid")).toBeVisible();
});
