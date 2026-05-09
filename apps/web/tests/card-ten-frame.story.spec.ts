// ASK-FIRST decisions:
//   1. Level: story.
//   2. Assertion: data-ten-frame-filled equals the story's value AND the
//      number of `[data-ten-frame-cell="filled"]` cells matches. Two
//      independent oracles so a regression in either the attribute OR
//      the loop's render order surfaces immediately.
//   3. Selector: data-test="ten-frame", data-ten-frame-cell.
//   4. IDB: fresh.
//   5. Network: online.
//   6. Reduced motion: forced.

import { expect, test } from "./fixtures";

const STORY_BASE = "/iframe.html?id=components-card--";

const cases: Array<{ id: string; expected: number }> = [
  { id: "ten-frame-one", expected: 1 },
  { id: "ten-frame-three", expected: 3 },
  { id: "ten-frame-five", expected: 5 },
  { id: "ten-frame-seven", expected: 7 },
  { id: "ten-frame-nine", expected: 9 },
  { id: "ten-frame-ten", expected: 10 },
];

for (const { id, expected } of cases) {
  test(`Card.${id} renders ${expected} filled dots in a 2×5 grid`, async ({ page }) => {
    await page.goto(`${STORY_BASE}${id}`);
    const frame = page.getByTestId("ten-frame");
    await expect(frame).toBeVisible();
    await expect(frame).toHaveAttribute("data-ten-frame-filled", String(expected));
    await expect(frame.locator('[data-ten-frame-cell="filled"]')).toHaveCount(expected);
    await expect(frame.locator('[data-ten-frame-cell="empty"]')).toHaveCount(10 - expected);
  });
}

test("Card.ten-frame-target-seven renders 7 muted dots inside the target frame", async ({
  page,
}) => {
  await page.goto(`${STORY_BASE}ten-frame-target-seven`);
  const card = page.getByTestId("card");
  await expect(card).toHaveAttribute("data-card-variant", "target");
  await expect(card).toHaveAttribute("data-card-display", "ten-frame");
  const frame = page.getByTestId("ten-frame");
  await expect(frame.locator('[data-ten-frame-cell="filled"]')).toHaveCount(7);
});
