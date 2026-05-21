// ASK-FIRST decisions:
//   1. Level: story.
//   2. Assertion: Empty renders nothing (data-test selector should not
//      resolve). ThreeCrystals renders three crystal pills with the
//      expected per-crystal data-test ids. SixCrystals confirms the row
//      scales without truncation.
//   3. Selectors: data-test="collection-bar" (the container),
//      data-test="collection-crystal-<id>" (per-pill).
//   4. IDB: fresh.
//   5. Network: online.
//   6. Reduced motion: forced.

import { expect, test } from "./fixtures";

const STORY_BASE = "/iframe.html?id=components-collectionbar--";

test("CollectionBar.Empty renders nothing", async ({ page }) => {
  await page.goto(`${STORY_BASE}empty`);
  await expect(page.getByTestId("collection-bar")).toHaveCount(0);
});

test("CollectionBar.ThreeCrystals renders one pill per owned crystal", async ({ page }) => {
  await page.goto(`${STORY_BASE}three-crystals`);
  await expect(page.getByTestId("collection-bar")).toBeVisible();
  for (const id of ["marine-snow", "phosphor-numerals", "maras-compass"]) {
    const pill = page.getByTestId(`collection-crystal-${id}`);
    await expect(pill).toBeVisible();
    await expect(pill.locator("img")).toHaveAttribute(
      "src",
      new RegExp(`/img/crystals/${id}\\.svg$`),
    );
  }
});

test("CollectionBar.SixCrystals renders all six pills", async ({ page }) => {
  await page.goto(`${STORY_BASE}six-crystals`);
  await expect(page.getByTestId("collection-bar")).toBeVisible();
  for (const id of [
    "marine-snow",
    "phosphor-numerals",
    "maras-compass",
    "edge-coral",
    "lucky-strike",
    "caustic-light",
  ]) {
    await expect(page.getByTestId(`collection-crystal-${id}`)).toBeVisible();
  }
});
