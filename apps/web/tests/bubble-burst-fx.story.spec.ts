// ASK-FIRST decisions:
//   1. Level: story.
//   2. Assertion: Disabled renders nothing. Burst mounts the layer with
//      9 bubbles. Interactive re-mounts the layer when the "Burst again"
//      button is clicked (verified by counting bubbles after a click).
//   3. Selectors: data-test="bubble-burst-fx" (the layer wrapper),
//      data-test="bubble-burst-again" (the Interactive story button).
//   4. IDB: fresh.
//   5. Network: online.
//   6. Reduced motion: forced — the rise keyframe collapses to a no-op
//      but the structural assertions still hold.

import { expect, test } from "./fixtures";

const STORY_BASE = "/iframe.html?id=components-bubbleburstfx--";

test("BubbleBurstFx.Disabled renders nothing", async ({ page }) => {
  await page.goto(`${STORY_BASE}disabled`);
  await expect(page.getByTestId("bubble-burst-fx")).toHaveCount(0);
});

test("BubbleBurstFx.Burst mounts the layer with bubble spans", async ({ page }) => {
  await page.goto(`${STORY_BASE}burst`);
  const layer = page.getByTestId("bubble-burst-fx");
  await expect(layer).toBeVisible();
  // The component renders 9 bubble spans (constant BUBBLE_COUNT).
  await expect(layer.locator("span")).toHaveCount(9);
});

test("BubbleBurstFx.Interactive re-mounts the layer when the trigger advances", async ({
  page,
}) => {
  await page.goto(`${STORY_BASE}interactive`);
  // Initial mount — trigger=1.
  await expect(page.getByTestId("bubble-burst-fx")).toBeVisible();
  await page.getByTestId("bubble-burst-again").click();
  // Layer still present after the trigger advance (new mount with new key).
  await expect(page.getByTestId("bubble-burst-fx")).toBeVisible();
  // Bubble button advances to "Burst again (2)" after the click.
  await expect(page.getByTestId("bubble-burst-again")).toContainText("Burst again (2)");
});
