// ASK-FIRST decisions:
//   1. Level: story (Storybook iframe URL, no router context needed).
//   2. Assertion: worksheet-page mounts AND renders the expected count of
//      problem rows (12 for stage 1, 12 for stage 12). Counts drift quietly
//      when the generator regresses; row-count is the cheapest tripwire.
//   3. Selector: data-test="worksheet-page" + .problem-row class. The class
//      is stable because print CSS depends on it (`page-break-inside: avoid`).
//   4. IDB: fresh (default fixture).
//   5. Network: online.
//   6. Reduced motion: forced (project default).

import { expect, test } from "./fixtures";

const STORY_BASE = "/iframe.html?id=worksheet-page--";

test("WorksheetPage.Stage1VariantA renders 12 fill-pair problems", async ({ page }) => {
  await page.goto(`${STORY_BASE}stage-1-variant-a`);
  await expect(page.getByTestId("worksheet-page")).toBeVisible();
  await expect(page.locator(".problem-row")).toHaveCount(12);
  // The header should show the stage title and variant chip.
  await expect(page.getByRole("heading", { name: /Stage 1: Adding Up/i })).toBeVisible();
});

test("WorksheetPage.Stage12TrueFalse mounts with TRUE/FALSE choices on every row", async ({
  page,
}) => {
  await page.goto(`${STORY_BASE}stage-12-true-false`);
  await expect(page.getByTestId("worksheet-page")).toBeVisible();
  const rows = page.locator(".problem-row");
  await expect(rows).toHaveCount(12);
  // 12 problems × {TRUE, FALSE} pills = 12 each.
  await expect(page.getByText("TRUE", { exact: true })).toHaveCount(12);
  await expect(page.getByText("FALSE", { exact: true })).toHaveCount(12);
});

test("WorksheetPage.Stage15Multiply renders the product-finding layout", async ({ page }) => {
  await page.goto(`${STORY_BASE}stage-15-multiply`);
  await expect(page.getByTestId("worksheet-page")).toBeVisible();
  await expect(page.locator(".problem-row")).toHaveCount(12);
});
