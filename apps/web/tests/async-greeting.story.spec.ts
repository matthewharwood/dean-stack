// ASK-FIRST decisions:
//   1. Level: story.
//   2. Assertion: greeting text appears after the Promise resolves.
//   3. Selector: getByText (web-first, retries until visible).
//   4. IDB: fresh.
//   5. Network: online.
//   6. Reduced motion: forced.

import { expect, test } from "./fixtures";

test("AsyncGreeting resolves and renders", async ({ page }) => {
  await page.goto(`/iframe.html?id=components-asyncgreeting--default`);
  await expect(page.getByText(/hello, dean/i)).toBeVisible();
});
