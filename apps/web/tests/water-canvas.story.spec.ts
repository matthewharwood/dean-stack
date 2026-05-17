// ASK-FIRST decisions:
//   1. Level: story.
//   2. Assertion: the <canvas> mounts with data-test="water-canvas".
//      We deliberately do NOT assert pixel output — headless Chromium's
//      WebGL pipeline through SwiftShader is reliable enough to render
//      the shader, but pixel-perfect snapshot testing of a procedural
//      animated shader is flaky by construction (every frame differs).
//      Mounting is the testable contract; visuals are eyeballed in
//      Storybook.
//   3. Selector: data-test="water-canvas".
//   4. IDB: fresh.
//   5. Network: online.
//   6. Reduced motion: forced (this also exercises the no-ticker branch).

import { expect, test } from "./fixtures";

test("WaterCanvas.Default mounts a sized canvas element", async ({ page }) => {
  await page.goto("/iframe.html?id=components-watercanvas--default");
  const canvas = page.getByTestId("water-canvas");
  await expect(canvas).toBeVisible();
  // Pixi sizes the backing-store via resizeTo. The decorator wraps the
  // canvas in a 720×360 frame; Pixi should have set width/height to at
  // least the parent rect's px values (with devicePixelRatio scaling).
  const box = await canvas.boundingBox();
  expect(box?.width).toBeGreaterThan(0);
  expect(box?.height).toBeGreaterThan(0);
});
