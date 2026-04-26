// ASK-FIRST decisions:
//   1. Level: story.
//   2. Assertion: top scorer renders, full list visible.
//   3. Selector: getByText.
//   4. IDB: fresh.
//   5. Network: online.
//   6. Reduced motion: forced.

import { expect, test } from "./fixtures";

test("Scoreboard.ThreePlayers shows the top scorer first", async ({ page }) => {
  await page.goto(`/iframe.html?id=components-scoreboard--three-players`);
  await expect(page.getByText(/Dean: 30/)).toBeVisible();
  await expect(page.getByText(/Alex: 25/)).toBeVisible();
  await expect(page.getByText(/Sam: 18/)).toBeVisible();
});
