// ASK-FIRST decisions:
//   1. Level: story.
//   2. Assertion: the wrapping <div data-test="pixi-canvas-demo"> is visible
//      AND the inner <canvas> exposes the expected width/height attributes
//      (proving Application.init wired the canvas, even though Pixi's pixel
//      content is not DOM-queryable).
//   3. Selector: getByTestId for the wrapper, locator for the canvas child.
//   4. IDB: fresh.
//   5. Network: online.
//   6. Reduced motion: forced (project default) — `usePixiApp` short-circuits
//      the Ticker, so this test does NOT depend on rotation timing.

import { expect, test } from "./fixtures";

test("PixiCanvasDemo mounts a sized canvas", async ({ page }) => {
  await page.goto("/iframe.html?id=components-pixicanvasdemo--default");

  const wrapper = page.getByTestId("pixi-canvas-demo");
  await expect(wrapper).toBeVisible();

  const canvas = wrapper.locator("canvas");
  await expect(canvas).toHaveAttribute("width", "320");
  await expect(canvas).toHaveAttribute("height", "240");
});
