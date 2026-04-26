// ASK-FIRST decisions:
//   1. Level: story.
//   2. Assertion: post-animation rendered text is visible. Reduced-motion is
//      forced (project default), so useAnime short-circuits and the final
//      state is shown immediately.
//   3. Selector: getByText.
//   4. IDB: fresh.
//   5. Network: online.
//   6. Reduced motion: forced (the canonical case for this stack).

import { expect, test } from "./fixtures";

test("FadeIn renders content with reduced-motion forced", async ({ page }) => {
  await page.goto(`/iframe.html?id=components-fadein--default`);
  await expect(page.getByText(/hello, dean/i)).toBeVisible();
});
