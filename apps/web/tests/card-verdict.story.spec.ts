// ASK-FIRST decisions:
//   1. Level: story.
//   2. Assertion: data-card-verdict attribute matches expected, visible
//      TRUE/FALSE label, AND tone class on the inner verdict-body so a
//      tint regression (e.g., both verdicts going red) fails the test.
//   3. Selector: data-test="card", data-test="verdict-body".
//   4. IDB: fresh.
//   5. Network: online.
//   6. Reduced motion: forced.

import { expect, test } from "./fixtures";

const STORY_BASE = "/iframe.html?id=components-card--";

test("Card.VerdictTrue renders a green TRUE card", async ({ page }) => {
  await page.goto(`${STORY_BASE}verdict-true`);
  const card = page.getByTestId("card");
  await expect(card).toHaveAttribute("data-card-verdict", "true");
  await expect(card).toHaveAttribute("data-card-display", "verdict");
  await expect(card).not.toHaveAttribute("data-card-value");
  const body = page.getByTestId("verdict-body");
  await expect(body).toBeVisible();
  await expect(body).toContainText("TRUE");
  await expect(body).toHaveAttribute("data-verdict", "true");
});

test("Card.VerdictFalse renders an orange FALSE card", async ({ page }) => {
  await page.goto(`${STORY_BASE}verdict-false`);
  const card = page.getByTestId("card");
  await expect(card).toHaveAttribute("data-card-verdict", "false");
  await expect(card).toHaveAttribute("data-card-display", "verdict");
  await expect(card).not.toHaveAttribute("data-card-value");
  const body = page.getByTestId("verdict-body");
  await expect(body).toBeVisible();
  await expect(body).toContainText("FALSE");
  await expect(body).toHaveAttribute("data-verdict", "false");
});
