import { describe, expect, test } from "bun:test";

import { BASELINE_DIGIT_STROKES, BASELINE_DIGIT_TEMPLATES } from "./baselines/digits";
import { recognize } from "./recognize";
import type { DigitLabel, Stroke } from "./schema";

// Regression guard for the "always returns the first iterated template"
// bug. The cause was a too-tight MAX_CLOUD_DISTANCE that clamped almost
// every cross-match score to 0, and the tie-break fell to insertion
// order. Tests:
//   - Every baseline RAW STROKE (not the preprocessed template points)
//     correctly recognizes as its own label
//   - Even noisy variations of each digit shape do
//   - When the scoring is broken (denominator too tight), this test
//     will catch the regression because the tie-break winners are not
//     what each candidate "should" be
describe("cross-recognition — every digit beats every other against the full baseline set", () => {
  const digits: DigitLabel[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

  test("every baseline variant recognizes as its own digit", () => {
    for (const label of digits) {
      const variants = BASELINE_DIGIT_STROKES[label];
      for (const [idx, strokes] of variants.entries()) {
        const r = recognize(strokes, BASELINE_DIGIT_TEMPLATES);
        expect({ label, idx, winner: r.label, confident: r.confident }).toEqual({
          label,
          idx,
          winner: label,
          confident: true,
        });
      }
    }
  });

  test("noisy variations of each digit still recognize correctly", () => {
    // Add ±2 unit jitter to each point of variant 0 — simulates the
    // imprecision of a kid's hand drawing the same general shape.
    let seed = 12345;
    const rng = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffff_ffff;
    };
    const jitter = (pts: readonly { x: number; y: number }[]): { x: number; y: number }[] =>
      pts.map((p) => ({ x: p.x + (rng() - 0.5) * 4, y: p.y + (rng() - 0.5) * 4 }));

    for (const label of digits) {
      const variant = BASELINE_DIGIT_STROKES[label][0];
      if (!variant) continue;
      const noisy: Stroke[] = variant.map((s) => ({ points: jitter(s.points) }));
      const r = recognize(noisy, BASELINE_DIGIT_TEMPLATES);
      expect({ label, winner: r.label }).toEqual({ label, winner: label });
      // Noisy versions might dip in confidence; just verify the recognizer
      // still picked the right digit and the score is meaningfully above
      // the tie-break floor.
      expect(r.score).toBeGreaterThan(0.4);
    }
  });

  test("the winner's score is meaningfully above the runner-up (no flat-zero ties)", () => {
    // The regression we're guarding against: if scores all collapse to
    // 0, the runner-up is just whoever was iterated second. A real
    // recognizer should show a gap between best and second-best.
    for (const label of digits) {
      const variant = BASELINE_DIGIT_STROKES[label][0];
      if (!variant) continue;
      const r = recognize(variant, BASELINE_DIGIT_TEMPLATES, { minScore: 0, minGap: 0 });
      expect({ label, winnerScore: r.score > 0 }).toEqual({ label, winnerScore: true });
      // Runner-up may exist for some digits but should be clearly behind.
      if (r.runnerUp) {
        expect(r.score - r.runnerUp.score).toBeGreaterThan(0.1);
      }
    }
  });

  test("a candidate that should NOT match anything (random scribble) scores below MIN_SCORE", () => {
    // A wholly random cloud — 30 points anywhere in [0, 100]². Should
    // not match any digit template confidently.
    let seed = 999;
    const rng = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffff_ffff;
    };
    const scribble: Stroke[] = [
      { points: Array.from({ length: 30 }, () => ({ x: rng() * 100, y: rng() * 100 })) },
    ];
    const r = recognize(scribble, BASELINE_DIGIT_TEMPLATES);
    // Either confident=false (rejected) OR if it does pick something,
    // the score should not be a "1.0 perfect" — that would indicate
    // the scoring is broken in the OTHER direction (too generous).
    if (r.confident) {
      expect(r.score).toBeLessThan(0.95);
    }
  });
});
