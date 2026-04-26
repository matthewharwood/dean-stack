// ASK-FIRST decisions used to scaffold this test (Pillar 4 / playwright-conventions):
//   1. Level: story (Storybook iframe URL).
//   2. Assertion: visible text — `toolchain healthy`.
//   3. Selector: getByText (no role; this is a static label).
//   4. IDB: fresh (default fixture; `auto: true`).
//   5. Network: online.
//   6. Reduced motion: forced (project default).
// Adjust these in collaboration with the user when this scenario evolves.

import { expect, test } from "./fixtures";

const STORY_ID = "components-healthcard--default";

test("HealthCard renders the toolchain-healthy message", async ({ page }) => {
  await page.goto(`/iframe.html?id=${STORY_ID}`);
  await expect(page.getByText(/toolchain healthy/i)).toBeVisible();
});
