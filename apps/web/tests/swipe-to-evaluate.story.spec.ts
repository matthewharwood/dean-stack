// ASK-FIRST decisions:
//   1. Level: story.
//   2. Assertion: render attrs per story (data-can-commit, visible
//      label text, swipe-knob aria-disabled), AND a real pointer drag
//      on the Interactive story that asserts the visible commit
//      counter goes 0 → 1.
//   3. Selectors: data-test="swipe-to-evaluate", data-test="swipe-knob",
//      data-test="swipe-label", data-test="commit-counter".
//   4. IDB: fresh.
//   5. Network: online.
//   6. Reduced motion: forced.
//
// Why pointer events (not mouse.down/move/up):
//   The component listens for `onPointerDown` / `onPointerMove` /
//   `onPointerUp` so it can `setPointerCapture` mid-drag. Playwright's
//   `page.mouse.*` API dispatches MouseEvents only; React 19 doesn't
//   synthesise PointerEvents from those, so the component would never
//   start the drag session. `page.locator(...).dispatchEvent('pointer*')`
//   sends real PointerEvents through React's synthetic-event pipeline.

import { expect, test } from "./fixtures";

const STORY_BASE = "/iframe.html?id=components-swipetoevaluate--";

test("SwipeToEvaluate.Ready renders the swipe affordance with the default label", async ({
  page,
}) => {
  await page.goto(`${STORY_BASE}ready`);
  const wrapper = page.getByTestId("swipe-to-evaluate");
  await expect(wrapper).toHaveAttribute("data-can-commit", "true");
  await expect(page.getByTestId("swipe-label")).toHaveText("Swipe to attack");
  const knob = page.getByTestId("swipe-knob");
  await expect(knob).toBeVisible();
  await expect(knob).toHaveAttribute("tabindex", "0");
});

test("SwipeToEvaluate.Disabled mutes the affordance and swaps the label", async ({ page }) => {
  await page.goto(`${STORY_BASE}disabled`);
  const wrapper = page.getByTestId("swipe-to-evaluate");
  await expect(wrapper).toHaveAttribute("data-can-commit", "false");
  await expect(page.getByTestId("swipe-label")).toHaveText("Fill out the board");
  const knob = page.getByTestId("swipe-knob");
  await expect(knob).toHaveAttribute("tabindex", "-1");
});

test("SwipeToEvaluate.CustomLabel surfaces the override label", async ({ page }) => {
  await page.goto(`${STORY_BASE}custom-label`);
  await expect(page.getByTestId("swipe-label")).toHaveText("Swipe to commit");
});

test("SwipeToEvaluate.Interactive — full right-to-left drag fires onCommit once", async ({
  page,
}) => {
  await page.goto(`${STORY_BASE}interactive`);

  const counter = page.getByTestId("commit-counter");
  await expect(counter).toHaveText("commits: 0");

  const knob = page.getByTestId("swipe-knob");
  const track = page.getByTestId("swipe-to-evaluate").locator("> div").first();
  const knobBox = await knob.boundingBox();
  const trackBox = await track.boundingBox();
  if (!knobBox || !trackBox) throw new Error("knob/track not measurable");

  const startX = knobBox.x + knobBox.width / 2;
  const startY = knobBox.y + knobBox.height / 2;
  // Drag all the way to the left edge of the track — way past the 70%
  // commit threshold. Negative deltaX in screen space ⇒ right-to-left.
  const endX = trackBox.x + 12;
  const endY = startY;

  // Real PointerEvents via dispatchEvent so the component's
  // onPointer{Down,Move,Up} chain fires. Playwright's mouse helpers
  // would emit MouseEvents only.
  const pointerId = 7;
  await knob.dispatchEvent("pointerdown", {
    pointerId,
    pointerType: "mouse",
    clientX: startX,
    clientY: startY,
    button: 0,
    buttons: 1,
    isPrimary: true,
  });
  // Couple of intermediate moves so the component sees real drag motion.
  for (const t of [0.25, 0.5, 0.75, 1]) {
    await knob.dispatchEvent("pointermove", {
      pointerId,
      pointerType: "mouse",
      clientX: startX + (endX - startX) * t,
      clientY: endY,
      button: 0,
      buttons: 1,
      isPrimary: true,
    });
  }
  await knob.dispatchEvent("pointerup", {
    pointerId,
    pointerType: "mouse",
    clientX: endX,
    clientY: endY,
    button: 0,
    buttons: 0,
    isPrimary: true,
  });

  // The counter ticks AFTER the COMMIT_HOLD_MS hold (180ms). Waiting
  // for the text change is more reliable than a hardcoded sleep.
  await expect(counter).toHaveText("commits: 1");
});

test("SwipeToEvaluate.Interactive — drag from the track label also commits", async ({ page }) => {
  await page.goto(`${STORY_BASE}interactive`);

  const counter = page.getByTestId("commit-counter");
  await expect(counter).toHaveText("commits: 0");

  const track = page.getByTestId("swipe-to-evaluate").locator("> div").first();
  const trackBox = await track.boundingBox();
  if (!trackBox) throw new Error("track not measurable");

  const startX = trackBox.x + trackBox.width * 0.55;
  const startY = trackBox.y + trackBox.height / 2;
  const endX = trackBox.x + 12;
  const pointerId = 8;

  await track.dispatchEvent("pointerdown", {
    pointerId,
    pointerType: "touch",
    clientX: startX,
    clientY: startY,
    button: 0,
    buttons: 1,
    isPrimary: true,
  });
  await track.dispatchEvent("pointermove", {
    pointerId,
    pointerType: "touch",
    clientX: endX,
    clientY: startY,
    button: 0,
    buttons: 1,
    isPrimary: true,
  });
  await track.dispatchEvent("pointerup", {
    pointerId,
    pointerType: "touch",
    clientX: endX,
    clientY: startY,
    button: 0,
    buttons: 0,
    isPrimary: true,
  });

  await expect(counter).toHaveText("commits: 1");
});
