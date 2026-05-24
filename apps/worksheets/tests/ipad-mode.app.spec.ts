import { expect, test } from "./fixtures";

// iPad-mode smoke + synthetic-stroke recognition test. Walks the kid
// flow at the route level (PointerEvent capture → recognizer → IDB → Submit
// gate) rather than the component level — the in-app integration is the
// thing most likely to silently regress.
//
// Why these structural choices (per Pillar 1's "ask first" rule, decided
// up-front with the user):
//   - Route-level test against `vite preview`-served build, not Storybook
//   - Uses Playwright's pointer API (mouse) to synthesize strokes; AnswerCell
//     accepts "mouse" alongside "pen" in dev/test
//   - Asserts the cell flips to phase="settled" with a digit AND that the
//     recognized digit overlay renders — does NOT assert any specific
//     digit, since synthetic strokes against the synthetic baselines may
//     not be a stable match every run
//   - Does not exercise the full GradeView grading flow (would need to
//     synth-stroke 12 cells; brittle without per-cell tuning) — Submit gate
//     check is enough for the integration assertion

test.describe("iPad mode — synthetic stroke recognition", () => {
  test("toggle persists, AnswerCells render, a clean stroke flips a cell to confident", async ({
    page,
  }) => {
    // Stage 9: single-digit fill-blank (the only auto-gradeable shape).
    await page.goto("/stage/s9/A");
    await page.waitForSelector('[data-test="worksheet-page"]');

    // Default mode is print; toggle to iPad. (Reload-persistence isn't
    // asserted here — the fixtures.ts freshIDB init script re-runs on
    // every navigation, intentionally erasing IDB between page loads.
    // That makes per-test isolation rock-solid but makes a reload-survives
    // check impossible without a separate fixture. The in-app
    // atomWithIDB → IDB write path is exercised end-to-end by the cell
    // recognition step below.)
    const toggle = page.getByTestId("mode-toggle");
    await expect(toggle).toHaveAttribute("data-mode", "print");
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-mode", "ipad");

    // Every fill-blank problem renders an AnswerCell now.
    const cells = page.getByTestId("answer-cell");
    await expect(cells.first()).toBeVisible();
    const cellCount = await cells.count();
    expect(cellCount).toBeGreaterThan(0);

    // Submit button visible and disabled (no strokes yet).
    const submit = page.getByTestId("submit-button");
    await expect(submit).toBeVisible();
    await expect(submit).toBeDisabled();

    // Synthesize a confident stroke on the first cell. Pattern is a tall
    // vertical bar — the "1" baseline is the simplest line shape and the
    // one most likely to match a Playwright mouse drag without tuning.
    const firstCell = cells.first();
    const box = await firstCell.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    const cx = box.x + box.width / 2;
    const top = box.y + box.height * 0.2;
    const bottom = box.y + box.height * 0.8;
    await page.mouse.move(cx, top);
    await page.mouse.down();
    const steps = 16;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      await page.mouse.move(cx, top + (bottom - top) * t);
    }
    await page.mouse.up();
    // Wait past the InkCanvas end-of-stroke debounce (600ms).
    await page.waitForTimeout(900);

    // The cell should now have phase=settled with a non-empty digit and
    // a visible recognized-digit overlay (the clean typography reveal
    // post-morph). We don't assert WHICH digit — synth strokes against
    // synth baselines aren't a stable mapping until the kid's own
    // templates accumulate — only that the recognition pipeline ran
    // end-to-end and the ink→digit reveal landed.
    await expect(firstCell).toHaveAttribute("data-phase", "settled");
    await expect(firstCell).toHaveAttribute("data-digit", /\d/);
    const recognized = firstCell.getByTestId("recognized-digit");
    await expect(recognized).toBeVisible();
    await expect(recognized).toHaveText(/\d/);

    // Submit stays disabled — only ONE cell got strokes.
    await expect(submit).toBeDisabled();
  });
});
