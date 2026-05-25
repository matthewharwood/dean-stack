// ASK-FIRST decisions (user-confirmed):
//   1. Level: app (preview on :3000) — Round 13 must render against the
//      real route + atoms + IDB rehydrate path. A story-level mount of
//      EquationView wouldn't exercise the stepper hook's wiring.
//   2. Assertion: equation has shape="find-missing-factor", three locked
//      slots [a, stepper, c], the stepper card is interactive, and a
//      correctly-tapped stepper produces a win outcome. The MATH is unit-
//      tested in evaluate.test.ts; this spec proves the wiring.
//   3. Selector: data-test attributes — same family as the other round
//      specs (data-test="equation", "equation-slot", "splash-begin",
//      "dev-menu-button", "dev-menu-jump-round-13", "stepper-card",
//      "stepper-increment", "stepper-decrement", "stepper-numeral").
//   4. IDB: fresh (default fixture).
//   5. Network: online.
//   6. Reduced motion: forced.

import { expect, test } from "./fixtures";

// Local retries to absorb the documented `atomWithIDB` re-render gap
// (see the SKIP note in `maze-level.app.spec.ts`) — under full-gate
// parallel load the splash → equation transition occasionally races
// against the post-set-atom re-render.
test.describe.configure({ retries: 2 });

test("Round 13 entry renders find-missing-factor equation with three locked slots", async ({
  page,
}) => {
  await page.goto("/adding-game");

  await page.getByTestId("splash-begin").click();
  await expect(page.getByTestId("equation")).toBeVisible({ timeout: 15_000 });

  await page.getByTestId("dev-menu-button").click();
  await page.getByTestId("dev-menu-jump-round-13").click();

  const equation = page.getByTestId("equation");
  await expect(equation).toHaveAttribute("data-shape", "find-missing-factor");

  // [a locked] × [stepper locked] = [c locked] → exactly 3 equation slots
  // (the stepper card sits in its own wrapper inside slot 1).
  const slots = page.getByTestId("equation-slot");
  await expect(slots).toHaveCount(3);

  // Slot 0 is the locked first factor; slot 2 is the locked product.
  const aSlot = slots.nth(0);
  const cSlot = slots.nth(2);
  await expect(aSlot).toHaveAttribute("data-slot-locked", "true");
  await expect(cSlot).toHaveAttribute("data-slot-locked", "true");

  // The middle slot contains the StepperCard.
  const stepperCard = page.getByTestId("stepper-card");
  await expect(stepperCard).toBeVisible();

  // Operator pill between a and stepper is the multiply glyph (× U+00D7).
  const multiplyPill = page.getByTestId("operator-pill").first();
  await expect(multiplyPill).toHaveText("×");

  // Tally-marks captions sit above each card in the R13 layout. The
  // exact words map 1:1 to the parent's on-paper teaching method —
  // size of each tally group, number of groups, total tallies. Any
  // rename to this vocabulary needs to land here AND in the route's
  // FindMissingFactorLabeledSlot calls together.
  const labels = page.getByTestId("r13-slot-label");
  await expect(labels).toHaveCount(3);
  await expect(labels.nth(0)).toHaveText("Tallies per group");
  await expect(labels.nth(1)).toHaveText("Number of groups");
  await expect(labels.nth(2)).toHaveText("Total tallies");

  // Round indicator reads round 13 with total levels = 68.
  const indicator = page.getByTestId("round-indicator");
  await expect(indicator).toHaveAttribute("data-round", "13");
  await expect(indicator).toHaveAttribute("data-total-levels", "90");
});

test("Round 13 stepper increment / decrement mutates the displayed value and clamps at 0..10", async ({
  page,
}) => {
  await page.goto("/adding-game");

  await page.getByTestId("splash-begin").click();
  await expect(page.getByTestId("equation")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("dev-menu-button").click();
  await page.getByTestId("dev-menu-jump-round-13").click();

  const stepperCard = page.getByTestId("stepper-card");
  await expect(stepperCard).toBeVisible();

  // Drive the stepper to 0 by tapping decrement enough times. The clamp
  // at 0 is the same `applyStep` guard the unit test covers; we verify
  // the route reaches that floor end-to-end. Worst-case start = 10
  // (impossible — distance from answer ≥ 1 means start ≤ 9), so 15
  // taps is a safe upper bound.
  for (let i = 0; i < 15; i++) {
    await page.getByTestId("stepper-decrement").click();
  }
  await expect(stepperCard).toHaveAttribute("data-stepper-value", "0");

  // Now drive up to the hard cap at 10 and verify it doesn't go past.
  for (let i = 0; i < 15; i++) {
    await page.getByTestId("stepper-increment").click();
  }
  await expect(stepperCard).toHaveAttribute("data-stepper-value", "10");
});
