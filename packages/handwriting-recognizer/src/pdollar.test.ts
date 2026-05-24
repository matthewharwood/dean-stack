import { describe, expect, test } from "bun:test";

import { cloudDistance, MAX_CLOUD_DISTANCE, preprocess, RESAMPLE_N } from "./pdollar";
import type { Stroke } from "./schema";

describe("$P+ preprocessing — resample + normalize", () => {
  test("resamples a single straight-line stroke to exactly N points", () => {
    const stroke: Stroke = {
      points: Array.from({ length: 5 }, (_, i) => ({ x: i, y: 0 })),
    };
    const out = preprocess([stroke]);
    expect(out.length).toBe(RESAMPLE_N);
  });

  test("centroid of the preprocessed cloud is at the origin", () => {
    const stroke: Stroke = {
      // arbitrary diagonal line, far from origin
      points: Array.from({ length: 10 }, (_, i) => ({ x: 100 + i, y: 50 + 2 * i })),
    };
    const out = preprocess([stroke]);
    const sumX = out.reduce((s, p) => s + p.x, 0);
    const sumY = out.reduce((s, p) => s + p.y, 0);
    expect(Math.abs(sumX / out.length)).toBeLessThan(1e-9);
    expect(Math.abs(sumY / out.length)).toBeLessThan(1e-9);
  });

  test("longest bbox axis is exactly 1.0 after scaling", () => {
    const stroke: Stroke = {
      // 100-wide × 10-tall stroke — width is the longest axis
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 5 },
        { x: 100, y: 10 },
      ],
    };
    const out = preprocess([stroke]);
    const xs = out.map((p) => p.x);
    const ys = out.map((p) => p.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    expect(Math.max(width, height)).toBeCloseTo(1, 5);
  });

  test("an empty stroke set preprocesses to empty (no throw)", () => {
    expect(preprocess([])).toEqual([]);
  });

  test("a single-point stroke survives preprocessing without crashing", () => {
    const out = preprocess([{ points: [{ x: 5, y: 5 }] }]);
    expect(out.length).toBeGreaterThan(0);
  });
});

describe("$P+ cloud distance — geometry sanity", () => {
  test("identical clouds match with distance ~0", () => {
    const stroke: Stroke = {
      points: makeCircle(50, 0, 0),
    };
    const a = preprocess([stroke]);
    const b = preprocess([stroke]);
    const d = cloudDistance(a, b);
    expect(d).toBeLessThan(1e-9);
  });

  test("translated copies match closely (translation-invariant)", () => {
    // Move the second copy 1000 units away; preprocess re-centers both.
    // Tolerance is ~0.1 not ~0 because FP cancellation error scales with
    // operand magnitude — diff of two ~1000 values has ~100× the absolute
    // ULP of diff of two ~10 values, and that propagates through the
    // resample's pathLength accumulation into slightly different sample
    // positions on the unit-normalized cloud.
    const stroke1: Stroke = { points: makeCircle(50, 0, 0) };
    const stroke2: Stroke = { points: makeCircle(50, 1000, 1000) };
    const a = preprocess([stroke1]);
    const b = preprocess([stroke2]);
    expect(cloudDistance(a, b)).toBeLessThan(0.1);
  });

  test("scaled copies match closely (scale-invariant)", () => {
    // Same caveat as the translated test — radius 1 vs radius 100 means
    // the small circle's distances are computed at ULP ~1e-16 while the
    // big one's are ~1e-14, and the accumulation diverges.
    const small: Stroke = { points: makeCircle(50, 0, 0, 1) };
    const big: Stroke = { points: makeCircle(50, 0, 0, 100) };
    const a = preprocess([small]);
    const b = preprocess([big]);
    expect(cloudDistance(a, b)).toBeLessThan(0.1);
  });

  test("a circle vs a vertical-line cloud is clearly NOT a match", () => {
    const circle: Stroke = { points: makeCircle(50, 0, 0) };
    const line: Stroke = {
      points: Array.from({ length: 50 }, (_, i) => ({ x: 0, y: i / 50 })),
    };
    const a = preprocess([circle]);
    const b = preprocess([line]);
    expect(cloudDistance(a, b)).toBeGreaterThan(0.05);
  });

  test("distance is bounded by the theoretical maximum constant", () => {
    // Construct two clouds at the extremes of the unit bbox so the
    // greedy match has to pay the full price.
    const a: Stroke = {
      points: Array.from({ length: 50 }, (_, i) => ({ x: -0.5 + i / 100, y: -0.5 })),
    };
    const b: Stroke = {
      points: Array.from({ length: 50 }, (_, i) => ({ x: -0.5 + i / 100, y: 0.5 })),
    };
    const pa = preprocess([a]);
    const pb = preprocess([b]);
    const d = cloudDistance(pa, pb);
    expect(d).toBeLessThanOrEqual(MAX_CLOUD_DISTANCE + 1e-9);
  });
});

function makeCircle(n: number, cx: number, cy: number, r = 10): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const theta = (i / n) * Math.PI * 2;
    return { x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) };
  });
}
