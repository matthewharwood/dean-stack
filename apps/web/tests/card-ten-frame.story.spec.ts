// ASK-FIRST decisions:
//   1. Level: story.
//   2. Assertion: per-frame `data-ten-frame-filled` attribute AND a count
//      of `[data-ten-frame-cell="filled"]` cells inside each frame. For
//      stacked-frame stories (values 11–20) the test asserts BOTH the
//      top frame (always 10) AND the bottom frame (value − 10). Two
//      independent oracles per frame so a regression in either the
//      attribute or the cell-render loop surfaces immediately.
//   3. Selector: `[data-test="ten-frame"][data-ten-frame-index="N"]`,
//      data-ten-frame-cell.
//   4. IDB: fresh.
//   5. Network: online.
//   6. Reduced motion: forced.

import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

const STORY_BASE = "/iframe.html?id=components-card--";

// Single-frame stories — value 1..10 lives in the top frame only.
const singleFrameCases: Array<{ id: string; expected: number }> = [
  { id: "ten-frame-one", expected: 1 },
  { id: "ten-frame-three", expected: 3 },
  { id: "ten-frame-five", expected: 5 },
  { id: "ten-frame-seven", expected: 7 },
  { id: "ten-frame-nine", expected: 9 },
  { id: "ten-frame-ten", expected: 10 },
];

function topFrame(page: Page) {
  return page.locator('[data-test="ten-frame"][data-ten-frame-index="0"]');
}

function bottomFrame(page: Page) {
  return page.locator('[data-test="ten-frame"][data-ten-frame-index="1"]');
}

for (const { id, expected } of singleFrameCases) {
  test(`Card.${id} renders ${expected} filled dots in a 2×5 grid`, async ({ page }) => {
    await page.goto(`${STORY_BASE}${id}`);
    const frame = topFrame(page);
    await expect(frame).toBeVisible();
    await expect(frame).toHaveAttribute("data-ten-frame-filled", String(expected));
    await expect(frame.locator('[data-ten-frame-cell="filled"]')).toHaveCount(expected);
    await expect(frame.locator('[data-ten-frame-cell="empty"]')).toHaveCount(10 - expected);
    // No bottom frame for values ≤ 10.
    await expect(bottomFrame(page)).toHaveCount(0);
  });
}

test("Card.ten-frame-target-seven renders 7 muted dots inside the target frame", async ({
  page,
}) => {
  await page.goto(`${STORY_BASE}ten-frame-target-seven`);
  const card = page.getByTestId("card");
  await expect(card).toHaveAttribute("data-card-variant", "target");
  await expect(card).toHaveAttribute("data-card-display", "ten-frame");
  const frame = topFrame(page);
  await expect(frame.locator('[data-ten-frame-cell="filled"]')).toHaveCount(7);
});

// Stacked-frame stories — value 11..20 splits across two frames. Top
// frame is always fully filled (10); bottom frame holds value − 10.
const stackedFrameCases: Array<{ id: string; value: number }> = [
  { id: "ten-frame-eleven", value: 11 },
  { id: "ten-frame-thirteen", value: 13 },
  { id: "ten-frame-seventeen", value: 17 },
  { id: "ten-frame-twenty", value: 20 },
];

for (const { id, value } of stackedFrameCases) {
  test(`Card.${id} stacks two ten-frames totaling ${value} dots`, async ({ page }) => {
    await page.goto(`${STORY_BASE}${id}`);
    const top = topFrame(page);
    const bottom = bottomFrame(page);
    const bottomCount = value - 10;
    await expect(top).toBeVisible();
    await expect(bottom).toBeVisible();
    await expect(top).toHaveAttribute("data-ten-frame-filled", "10");
    await expect(bottom).toHaveAttribute("data-ten-frame-filled", String(bottomCount));
    await expect(top.locator('[data-ten-frame-cell="filled"]')).toHaveCount(10);
    await expect(bottom.locator('[data-ten-frame-cell="filled"]')).toHaveCount(bottomCount);
    await expect(bottom.locator('[data-ten-frame-cell="empty"]')).toHaveCount(10 - bottomCount);
  });
}

test("Card.ten-frame-target-fifteen stacks two muted frames inside the target frame", async ({
  page,
}) => {
  await page.goto(`${STORY_BASE}ten-frame-target-fifteen`);
  const card = page.getByTestId("card");
  await expect(card).toHaveAttribute("data-card-variant", "target");
  await expect(card).toHaveAttribute("data-card-display", "ten-frame");
  await expect(topFrame(page).locator('[data-ten-frame-cell="filled"]')).toHaveCount(10);
  await expect(bottomFrame(page).locator('[data-ten-frame-cell="filled"]')).toHaveCount(5);
});
