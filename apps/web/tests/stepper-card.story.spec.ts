// ASK-FIRST decisions:
//   1. Level: story.
//   2. Assertion: data-stepper-value attribute matches the story's
//      starting value AND the visible numeral text. Disabled story
//      asserts data-stepper-disabled="true" + both buttons disabled.
//      Interactive story clicks the + half and asserts the aria-label
//      of the increment button updated (label is value-derived, so it
//      proves the handler wired to React state, not just visual click).
//   3. Selectors: data-test="stepper-card", data-test="stepper-numeral",
//      data-test="stepper-increment", data-test="stepper-decrement".
//   4. IDB: fresh.
//   5. Network: online.
//   6. Reduced motion: forced.

import { expect, test } from "./fixtures";

const STORY_BASE = "/iframe.html?id=components-steppercard--";

const renderCases: Array<{ id: string; value: number }> = [
  { id: "zero", value: 0 },
  { id: "seven", value: 7 },
  { id: "twenty", value: 20 },
];

for (const { id, value } of renderCases) {
  test(`StepperCard.${id} renders ${value} in the centered numeral`, async ({ page }) => {
    await page.goto(`${STORY_BASE}${id}`);
    const card = page.getByTestId("stepper-card");
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("data-stepper-value", String(value));
    await expect(page.getByTestId("stepper-numeral")).toHaveText(String(value));
  });
}

test("StepperCard.Disabled grays out both halves", async ({ page }) => {
  await page.goto(`${STORY_BASE}disabled`);
  const card = page.getByTestId("stepper-card");
  await expect(card).toHaveAttribute("data-stepper-disabled", "true");
  await expect(page.getByTestId("stepper-increment")).toBeDisabled();
  await expect(page.getByTestId("stepper-decrement")).toBeDisabled();
});

test("StepperCard.Interactive increments numeral on + tap", async ({ page }) => {
  await page.goto(`${STORY_BASE}interactive`);
  const numeral = page.getByTestId("stepper-numeral");
  await expect(numeral).toHaveText("7");
  await page.getByTestId("stepper-increment").click();
  await expect(numeral).toHaveText("8");
  // aria-label is derived from the value — proves the handler reached
  // React state (not just visually flashed a click).
  await expect(page.getByTestId("stepper-increment")).toHaveAttribute(
    "aria-label",
    "Increase to 9",
  );
});

test("StepperCard.Interactive decrements numeral on − tap and clamps at 0", async ({ page }) => {
  await page.goto(`${STORY_BASE}interactive`);
  const numeral = page.getByTestId("stepper-numeral");
  const minus = page.getByTestId("stepper-decrement");
  await expect(numeral).toHaveText("7");
  await minus.click();
  await expect(numeral).toHaveText("6");
  // Mash − repeatedly past 0 — clamped at 0, no negative values.
  for (let i = 0; i < 10; i++) {
    await minus.click();
  }
  await expect(numeral).toHaveText("0");
});
