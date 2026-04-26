// ASK-FIRST decisions:
//   1. Level: story.
//   2. Assertion: Pending shows the Complete button; Completed shows the badge.
//   3. Selector: getByRole("button"), getByText.
//   4. IDB: fresh.
//   5. Network: online.
//   6. Reduced motion: forced.

import { expect, test } from "./fixtures";

test("LevelCard.Pending shows the Complete button", async ({ page }) => {
  await page.goto(`/iframe.html?id=components-levelcard--pending`);
  await expect(page.getByRole("button", { name: /complete/i })).toBeVisible();
});

test("LevelCard.Completed shows the completed badge", async ({ page }) => {
  await page.goto(`/iframe.html?id=components-levelcard--completed`);
  await expect(page.getByText(/completed/i)).toBeVisible();
});
