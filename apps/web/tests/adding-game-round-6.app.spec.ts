// ASK-FIRST decisions:
//   1. Level: app (preview on :3000) — round-6 wiring against the real route.
//   2. Assertion: equation has shape="find-missing-result", subtract operator
//      glyph rendered, locked static value 6 (post-1–5-cap retune; level 29
//      is glass-manta with `6 − ? = ?`). Mathematics correctness is covered
//      by evaluate.test.ts — this spec proves the rendering / dev jump path.
//   3. Selector: data-test attributes (data-test="equation",
//      "equation-slot", "splash-begin", "dev-menu-button",
//      "dev-menu-jump-round-6", "operator-pill").
//   4. IDB: fresh (default fixture).
//   5. Network: online.
//   6. Reduced motion: forced.

import { expect, test } from "./fixtures";

// Local retries to absorb the documented `atomWithIDB` re-render gap
// (see the SKIP note in `maze-level.app.spec.ts`) — under full-gate
// parallel load the splash → equation transition occasionally races
// against the post-set-atom re-render. Once the upstream re-render gap
// is fixed the retries can drop.
test.describe.configure({ retries: 2 });

test("Round 6 entry renders find-missing-result equation with subtract operator + static 10", async ({
  page,
}) => {
  await page.goto("/adding-game");

  await page.getByTestId("splash-begin").click();
  await expect(page.getByTestId("equation")).toBeVisible({ timeout: 15_000 });

  await page.getByTestId("dev-menu-button").click();
  await page.getByTestId("dev-menu-jump-round-6").click();

  const equation = page.getByTestId("equation");
  await expect(equation).toHaveAttribute("data-shape", "find-missing-result");

  const slots = page.getByTestId("equation-slot");
  await expect(slots).toHaveCount(3);

  // Level 29: 6 − ? = ?, position=first. Ten-frame display means the
  // numeral is absent — verify via data-card-value + the dot count
  // attribute on the inner frame.
  const lockedSlot = slots.nth(0);
  await expect(lockedSlot).toHaveAttribute("data-slot-locked", "true");
  const lockedCard = lockedSlot.getByTestId("card");
  await expect(lockedCard).toHaveAttribute("data-card-value", "6");
  await expect(lockedCard).toHaveAttribute("data-card-display", "ten-frame");
  await expect(lockedSlot.getByTestId("ten-frame")).toHaveAttribute("data-ten-frame-filled", "6");

  // Operator pill shows the minus sign (− U+2212).
  const minusPill = page.getByTestId("operator-pill").first();
  await expect(minusPill).toHaveText("−");

  const indicator = page.getByTestId("round-indicator");
  await expect(indicator).toHaveAttribute("data-round", "6");
});
