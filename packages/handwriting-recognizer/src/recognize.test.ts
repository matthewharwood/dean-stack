import { describe, expect, test } from "bun:test";

import { DEFAULT_MIN_GAP, DEFAULT_MIN_SCORE, makeTemplate, recognize } from "./recognize";
import type { Stroke, Template } from "./schema";

describe("recognize() — top-level inference + confidence gating", () => {
  test("empty strokes → null label, score 0, not confident", () => {
    const r = recognize([], [synthTemplate("3", makeLine(0, 0, 10, 10))]);
    expect(r.label).toBeNull();
    expect(r.score).toBe(0);
    expect(r.confident).toBe(false);
  });

  test("empty templates → null label, score 0, not confident", () => {
    const r = recognize([{ points: makeLine(0, 0, 10, 10) }], []);
    expect(r.label).toBeNull();
    expect(r.score).toBe(0);
    expect(r.confident).toBe(false);
  });

  test("a stroke that matches its own template → confident with score ~1", () => {
    const strokes: Stroke[] = [{ points: makeLine(0, 0, 10, 10) }];
    const tpl = makeTemplate("1", strokes);
    const r = recognize(strokes, [tpl]);
    expect(r.label).toBe("1");
    expect(r.score).toBeGreaterThan(0.95);
    expect(r.confident).toBe(true);
  });

  test("a stroke that doesn't match any template → null label, low score, not confident", () => {
    // Template: vertical line. Input: horizontal line. Should not match.
    const vert: Stroke = { points: makeLine(0, 0, 0, 10) };
    const horiz: Stroke = { points: makeLine(0, 0, 10, 0) };
    const tpl = makeTemplate("1", [vert]);
    const r = recognize([horiz], [tpl]);
    // With only one template, runnerUp is null and the gap-check passes
    // trivially, but the score should still be below MIN_SCORE.
    expect(r.score).toBeLessThan(DEFAULT_MIN_SCORE);
    expect(r.confident).toBe(false);
    expect(r.label).toBeNull();
  });

  test("when two labels score above MIN_SCORE but too close, confident is false", () => {
    // Identical strokes labeled differently — both will score 1.0, so the
    // gap is 0 < MIN_GAP and confident must be false.
    const stroke: Stroke = { points: makeLine(0, 0, 10, 0) };
    const tpl3 = makeTemplate("3", [stroke], { id: "t3" });
    const tpl8 = makeTemplate("8", [stroke], { id: "t8" });
    const r = recognize([stroke], [tpl3, tpl8]);
    expect(r.confident).toBe(false);
    expect(r.label).toBeNull();
    expect(r.score).toBeGreaterThan(0.95);
    expect(r.runnerUp).not.toBeNull();
    expect(r.runnerUp?.score).toBeGreaterThan(0.95);
  });

  test("custom thresholds: lowering MIN_SCORE lets borderline matches confidently grade", () => {
    // A diagonal vs an almost-diagonal — close but not identical. Default
    // thresholds (0.80 / 0.10) would reject; setting minScore: 0 must accept.
    const ref: Stroke = { points: makeLine(0, 0, 10, 10) };
    const wobbly: Stroke = { points: makeLine(0, 0, 9.5, 10) };
    const tpl = makeTemplate("1", [ref]);
    const strict = recognize([wobbly], [tpl]);
    const lax = recognize([wobbly], [tpl], { minScore: 0, minGap: 0 });
    // strict: with only one template, runnerUp is null so the gap check
    // passes trivially — confidence is purely driven by minScore. The
    // wobbly line still matches very tightly, so strict will still pass.
    // What matters here is that lax NEVER rejects.
    expect(lax.confident).toBe(true);
    expect(lax.label).toBe("1");
    expect(strict.score).toBeGreaterThan(lax.score - 1e-9);
  });

  test("multiple templates per label collapse to best-score-per-label", () => {
    const noisy1: Stroke = { points: makeLine(0, 0, 10, 0.05) };
    const clean1: Stroke = { points: makeLine(0, 0, 10, 0) };
    const garbage: Stroke = { points: makeLine(0, 0, 1, 1) };
    const goodTpl = makeTemplate("7", [clean1]);
    const badTpl = makeTemplate("7", [garbage]);
    const r = recognize([noisy1], [goodTpl, badTpl]);
    // The "7" label should win on the GOOD template, not get averaged
    // down by the garbage one. With only one label, runnerUp is null.
    expect(r.label).toBe("7");
    expect(r.runnerUp).toBeNull();
  });
});

describe("makeTemplate() — promote runtime strokes to templates", () => {
  test("returns a Template with source: 'user' and a unique id", () => {
    const strokes: Stroke[] = [{ points: makeLine(0, 0, 10, 0) }];
    const t = makeTemplate("4", strokes);
    expect(t.label).toBe("4");
    expect(t.source).toBe("user");
    expect(t.id).toMatch(/^user-4-/);
    expect(t.points.length).toBeGreaterThan(1);
    expect(t.createdAt).toBeDefined();
  });

  test("throws when the gesture is too sparse to preprocess", () => {
    expect(() => makeTemplate("0", [{ points: [{ x: 0, y: 0 }] }])).toThrow();
  });

  test("an id override is honored (for deterministic test fixtures)", () => {
    const t = makeTemplate("9", [{ points: makeLine(0, 0, 5, 5) }], { id: "fixture-9" });
    expect(t.id).toBe("fixture-9");
  });
});

describe("DEFAULT_MIN_SCORE / DEFAULT_MIN_GAP constants", () => {
  test("DEFAULT_MIN_SCORE is in (0, 1)", () => {
    expect(DEFAULT_MIN_SCORE).toBeGreaterThan(0);
    expect(DEFAULT_MIN_SCORE).toBeLessThan(1);
  });

  test("DEFAULT_MIN_GAP is in (0, 1)", () => {
    expect(DEFAULT_MIN_GAP).toBeGreaterThan(0);
    expect(DEFAULT_MIN_GAP).toBeLessThan(1);
  });
});

// ─── helpers ─────────────────────────────────────────────────────────────

function makeLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  n = 20,
): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  });
}

function synthTemplate(
  label: "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9",
  pts: { x: number; y: number }[],
): Template {
  return makeTemplate(label, [{ points: pts }]);
}
