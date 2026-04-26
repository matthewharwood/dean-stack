// ASK-FIRST decisions:
//   1. Level: story.
//   2. Assertion: typing filters items (matching items visible, non-matching hidden).
//   3. Selector: getByRole("searchbox") for the input; getByText for items.
//   4. IDB: fresh.
//   5. Network: online.
//   6. Reduced motion: forced.

import { expect, test } from "./fixtures";

test("FilterSearch filters items as the user types", async ({ page }) => {
  await page.goto(`/iframe.html?id=components-filtersearch--default`);
  const input = page.getByRole("searchbox");
  await input.fill("maze");
  await expect(page.getByText("maze", { exact: true })).toBeVisible();
  await expect(page.getByText("snake", { exact: true })).toBeHidden();
});
