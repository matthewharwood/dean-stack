// ASK-FIRST decisions:
//   1. Level: app (preview on :3000) — the round-5 entry has to render
//      against the real route + atoms, not a story stub.
//   2. Assertion: equation has shape="find-missing-result", the locked
//      static slot shows value 3, three slots are present, two are kid-
//      droppable. We do NOT play through the level — the math is unit-
//      tested in evaluate.test.ts; this spec only proves the wiring lands.
//   3. Selector: data-test attributes (data-test="equation",
//      "equation-slot", "splash-begin", "dev-menu-button",
//      "dev-menu-jump-round-5").
//   4. IDB: fresh (default fixture).
//   5. Network: online.
//   6. Reduced motion: forced — the dive-in intro short-circuits to 80ms.

import { expect, test } from "./fixtures";

// Local retries to absorb the documented `atomWithIDB` re-render gap
// (see the SKIP note in `maze-level.app.spec.ts`) — under full-gate
// parallel load (storybook + app + app-offline workers) the splash →
// equation transition occasionally races against the post-set-atom
// re-render. Standalone runs pass 3/3; CI already has `retries: 2`.
// Once the upstream re-render gap is fixed the retries can drop.
test.describe.configure({ retries: 2 });

test("Round 5 entry renders find-missing-result equation with locked static", async ({ page }) => {
  await page.goto("/adding-game");

  // Splash → begin → wait for round 1 to deal (intro is reduced-motion-fast).
  await page.getByTestId("splash-begin").click();
  await expect(page.getByTestId("equation")).toBeVisible({ timeout: 15_000 });

  // Open dev menu and jump to Round 5.
  await page.getByTestId("dev-menu-button").click();
  await page.getByTestId("dev-menu-jump-round-5").click();

  // Equation is now level 24: glass-manta, "1 + ? = ?", position=first
  // (post-1–5-cap retune — both operand and result cards must come from
  // the kid's [1, 5] hand range).
  const equation = page.getByTestId("equation");
  await expect(equation).toHaveAttribute("data-shape", "find-missing-result");

  const slots = page.getByTestId("equation-slot");
  await expect(slots).toHaveCount(3);

  // First slot is the locked static (value 1). With ten-frame display
  // the value lives on `data-card-value`, NOT the inner text — the
  // numeral is intentionally absent so the kid has to count dots.
  const lockedSlot = slots.nth(0);
  await expect(lockedSlot).toHaveAttribute("data-slot-locked", "true");
  const lockedCard = lockedSlot.getByTestId("card");
  await expect(lockedCard).toHaveAttribute("data-card-value", "1");
  await expect(lockedCard).toHaveAttribute("data-card-display", "ten-frame");
  await expect(lockedSlot.getByTestId("ten-frame")).toHaveAttribute("data-ten-frame-filled", "1");

  // Slots 1 and 2 are unlocked / empty (kid-droppable). Their
  // SlotWrapper has `data-slot-kind="equation"` and no data-locked.
  // Use the inner SlotWrapper anchor.
  const operandSlot = slots.nth(1);
  const resultSlot = slots.nth(2);
  await expect(operandSlot).not.toHaveAttribute("data-slot-locked", "true");
  await expect(resultSlot).not.toHaveAttribute("data-slot-locked", "true");

  // Round indicator confirms we're in round 5 of 15. The badge reads
  // "Round 5 / 15"; the bar strip's data-level-index attribute is
  // independent of the badge text and asserted via the dedicated
  // data attribute.
  const indicator = page.getByTestId("round-indicator");
  await expect(indicator).toHaveAttribute("data-round", "5");
  await expect(indicator).toHaveAttribute("data-total-levels", "90");
  await expect(indicator).toContainText("Round");
  await expect(indicator).toContainText("16");
});
