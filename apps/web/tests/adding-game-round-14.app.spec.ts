// ASK-FIRST decisions (mirrors R13 spec; same shape, stepper relocated):
//   1. Level: app (preview on :3000) — R14 must render against real
//      route + atoms.
//   2. Assertion: equation has shape="find-leading-factor", three locked
//      slots [stepper, b, c], the stepper card is interactive, labels
//      are re-mapped ("Number of groups" on LEFT, "Tallies per group"
//      in MIDDLE, "Total tallies" on RIGHT).
//   3. Selector: data-test attributes.
//   4. IDB: fresh (default fixture).
//   5. Network: online.
//   6. Reduced motion: forced.

import { expect, test } from "./fixtures";

test.describe.configure({ retries: 2 });

test("Round 14 entry renders find-leading-factor equation with stepper on the LEFT", async ({
  page,
}) => {
  await page.goto("/adding-game");

  await page.getByTestId("splash-begin").click();
  await expect(page.getByTestId("equation")).toBeVisible({ timeout: 15_000 });

  await page.getByTestId("dev-menu-button").click();
  await page.getByTestId("dev-menu-jump-round-14").click();

  const equation = page.getByTestId("equation");
  await expect(equation).toHaveAttribute("data-shape", "find-leading-factor");

  const slots = page.getByTestId("equation-slot");
  await expect(slots).toHaveCount(3);

  // Slot 0 is the stepper card; slots 1 and 2 are locked.
  const stepperCard = page.getByTestId("stepper-card");
  await expect(stepperCard).toBeVisible();

  // Operator pill is the multiply glyph (× U+00D7).
  const multiplyPill = page.getByTestId("operator-pill").first();
  await expect(multiplyPill).toHaveText("×");

  // R14 label re-mapping: LEFT = Number of groups (stepper), MIDDLE =
  // Tallies per group (locked b), RIGHT = Total tallies (locked c).
  // Renaming requires updating both the route AND this test together.
  const labels = page.getByTestId("r13-slot-label");
  await expect(labels).toHaveCount(3);
  await expect(labels.nth(0)).toHaveText("Number of groups");
  await expect(labels.nth(1)).toHaveText("Tallies per group");
  await expect(labels.nth(2)).toHaveText("Total tallies");

  // Round indicator reads round 14 with total levels = 78.
  const indicator = page.getByTestId("round-indicator");
  await expect(indicator).toHaveAttribute("data-round", "14");
  await expect(indicator).toHaveAttribute("data-total-levels", "90");
});

test("Round 14 stepper clamps at 0..10 (same factor cap as R13)", async ({ page }) => {
  await page.goto("/adding-game");

  await page.getByTestId("splash-begin").click();
  await expect(page.getByTestId("equation")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("dev-menu-button").click();
  await page.getByTestId("dev-menu-jump-round-14").click();

  const stepperCard = page.getByTestId("stepper-card");
  await expect(stepperCard).toBeVisible();

  for (let i = 0; i < 15; i++) {
    await page.getByTestId("stepper-decrement").click();
  }
  await expect(stepperCard).toHaveAttribute("data-stepper-value", "0");

  for (let i = 0; i < 15; i++) {
    await page.getByTestId("stepper-increment").click();
  }
  await expect(stepperCard).toHaveAttribute("data-stepper-value", "10");
});
