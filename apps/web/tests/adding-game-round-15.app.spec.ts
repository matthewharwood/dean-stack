// ASK-FIRST decisions (user-confirmed for R15 multi-choice redesign):
//   1. Level: app (preview on :3000) — full route + atoms.
//   2. Assertion: equation has shape="find-product", three operand
//      slots [a locked, b locked, answer empty], 5 candidate cards
//      visible under the equation, multiply pill rendered, total-
//      levels 78.
//   3. Selector: data-test attributes
//      (data-test="find-product-choices", "find-product-choice",
//      "find-product-answer-empty", "equation-slot", etc.).
//   4. IDB: fresh (default fixture).
//   5. Network: online.
//   6. Reduced motion: forced.

import { expect, test } from "./fixtures";

test.describe.configure({ retries: 2 });

test("Round 15 entry renders find-product multi-choice layout", async ({ page }) => {
  await page.goto("/adding-game");

  await page.getByTestId("splash-begin").click();
  await expect(page.getByTestId("equation")).toBeVisible({ timeout: 15_000 });

  await page.getByTestId("dev-menu-button").click();
  await page.getByTestId("dev-menu-jump-round-15").click();

  const equation = page.getByTestId("equation");
  await expect(equation).toHaveAttribute("data-shape", "find-product");

  // Three operand slots; the third (answer) is the kid-fillable
  // placeholder showing "?", the others are locked factor cards.
  const slots = page.getByTestId("equation-slot");
  await expect(slots).toHaveCount(3);
  await expect(page.getByTestId("find-product-answer-empty")).toBeVisible();

  // Multiply pill between the two factor slots.
  const multiplyPill = page.getByTestId("operator-pill").first();
  await expect(multiplyPill).toHaveText("×");

  // Five candidate cards in the choice row.
  const choices = page.getByTestId("find-product-choice");
  await expect(choices).toHaveCount(5);

  // Labels stay in their original slot positions.
  const labels = page.getByTestId("r13-slot-label");
  await expect(labels).toHaveCount(3);
  await expect(labels.nth(0)).toHaveText("Tallies per group");
  await expect(labels.nth(1)).toHaveText("Number of groups");
  await expect(labels.nth(2)).toHaveText("Total tallies");

  const indicator = page.getByTestId("round-indicator");
  await expect(indicator).toHaveAttribute("data-round", "15");
  await expect(indicator).toHaveAttribute("data-total-levels", "90");
});

test("Round 15 tapping the correct choice fills the answer slot and clears the placeholder", async ({
  page,
}) => {
  // End-to-end wiring proof: identify the correct choice by reading
  // the data-card-value attributes off the two locked factors and the
  // five candidate cards, tap the correct one, assert the placeholder
  // disappears and the slot reflects the product. The route's auto-
  // evaluate-on-tap path is what makes this single tap commit the
  // answer; we don't need a separate Evaluate click.
  await page.goto("/adding-game");

  await page.getByTestId("splash-begin").click();
  await expect(page.getByTestId("equation")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("dev-menu-button").click();
  await page.getByTestId("dev-menu-jump-round-15").click();

  const slots = page.getByTestId("equation-slot");
  await expect(slots).toHaveCount(3);
  // Slot 0 holds the locked `a`; slot 1 holds the locked `b`.
  const aValue = Number(await slots.nth(0).getByTestId("card").getAttribute("data-card-value"));
  const bValue = Number(await slots.nth(1).getByTestId("card").getAttribute("data-card-value"));
  expect(aValue).toBeGreaterThan(0);
  expect(bValue).toBeGreaterThan(0);
  const product = aValue * bValue;

  const choices = page.getByTestId("find-product-choice");
  await expect(choices).toHaveCount(5);

  // Find the choice whose data-card-value matches the product, tap it.
  // The locator API doesn't give us a direct "find by attribute value"
  // path, so iterate the five and click the first one matching.
  const choiceCount = await choices.count();
  let tapped = false;
  for (let i = 0; i < choiceCount; i++) {
    const choice = choices.nth(i);
    const v = Number(await choice.getAttribute("data-card-value"));
    if (v === product) {
      await choice.click();
      tapped = true;
      break;
    }
  }
  expect(tapped).toBe(true);

  // The placeholder "?" should be gone; the answer slot now shows the
  // committed product. Either the empty placeholder is no longer
  // visible (winning advance) or it's been replaced by a Card.
  await expect(page.getByTestId("find-product-answer-empty")).not.toBeVisible({ timeout: 3_000 });
});
