// ASK-FIRST decisions:
//   1. Level: story.
//   2. Assertion: Empty renders no layer at all (the component returns
//      null when nothing is owned). MarineSnowOnly + CausticLightOnly +
//      SnowAndCaustic surface the layer and the right per-effect inner
//      div via the data-test attributes the effects publish.
//   3. Selectors: data-test="crystal-effects-layer" (container),
//      data-test="crystal-effect-marine-snow" / "crystal-effect-caustic-light"
//      (per-effect inner div).
//   4. IDB: fresh.
//   5. Network: online.
//   6. Reduced motion: forced.

import { expect, test } from "./fixtures";

const STORY_BASE = "/iframe.html?id=components-crystaleffectslayer--";

test("CrystalEffectsLayer.Empty renders nothing", async ({ page }) => {
  await page.goto(`${STORY_BASE}empty`);
  await expect(page.getByTestId("crystal-effects-layer")).toHaveCount(0);
});

test("CrystalEffectsLayer.MarineSnowOnly renders snow without caustic light", async ({ page }) => {
  await page.goto(`${STORY_BASE}marine-snow-only`);
  await expect(page.getByTestId("crystal-effects-layer")).toBeVisible();
  await expect(page.getByTestId("crystal-effect-marine-snow")).toBeVisible();
  await expect(page.getByTestId("crystal-effect-caustic-light")).toHaveCount(0);
});

test("CrystalEffectsLayer.CausticLightOnly renders caustic without snow", async ({ page }) => {
  await page.goto(`${STORY_BASE}caustic-light-only`);
  await expect(page.getByTestId("crystal-effects-layer")).toBeVisible();
  await expect(page.getByTestId("crystal-effect-caustic-light")).toBeVisible();
  await expect(page.getByTestId("crystal-effect-marine-snow")).toHaveCount(0);
});

test("CrystalEffectsLayer.SnowAndCaustic renders both ambient effects together", async ({
  page,
}) => {
  await page.goto(`${STORY_BASE}snow-and-caustic`);
  await expect(page.getByTestId("crystal-effects-layer")).toBeVisible();
  await expect(page.getByTestId("crystal-effect-marine-snow")).toBeVisible();
  await expect(page.getByTestId("crystal-effect-caustic-light")).toBeVisible();
});
