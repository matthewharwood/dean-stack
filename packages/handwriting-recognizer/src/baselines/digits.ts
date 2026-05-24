// Baseline digit templates — day-1 seed data for the recognizer.
//
// These are SYNTHETIC reference templates: I drew the canonical adult
// form of each digit as a polyline in a 100×100 canvas, then wrap each
// in a Stroke and run it through `makeTemplate()` at import time. The
// upstream UJI Pen Characters dataset is the obvious upgrade path —
// when we have it parsed, we can swap baseline templates here without
// touching the recognizer.
//
// Why synthetic baselines are fine for this app:
//   - The whole point of $P+ is that ONE writer's templates dominate
//     once accumulated; baselines exist purely so the recognizer is not
//     empty on first use.
//   - The worksheets app promotes the kid's first confident strokes to
//     user templates automatically, so within ~10 sheets these baselines
//     are functionally irrelevant for him.
//   - Synthetic + deterministic means tests can pin exact expectations.
//
// Each digit gets multiple stroke variants where the digit naturally has
// them (e.g., 4 with separate crossbar, 7 with serifed top). The
// algorithm cares about post-normalization shape, so the 100×100 origin
// canvas size is arbitrary.

import { makeTemplate } from "../recognize";
import type { DigitLabel, Stroke, Template } from "../schema";

type DigitStrokes = readonly Stroke[];

// 100×100 reference coordinate system. (0, 0) top-left, +x right, +y down
// to match the inking canvas convention. Digits are drawn within the
// inner 20-80 box leaving a 20-unit margin on every side.

const DIGIT_STROKES: Record<DigitLabel, readonly DigitStrokes[]> = {
  "0": [
    // Tall oval, single stroke. Start top-center, go clockwise.
    [{ points: ellipse(50, 50, 28, 35, 0, 2 * Math.PI, 40, -Math.PI / 2) }],
    // Near-round circle — common kid variant in narrow cells where
    // the natural draw is closer to square than tall-oval.
    [{ points: ellipse(50, 50, 32, 33, 0, 2 * Math.PI, 40, -Math.PI / 2) }],
    // Open-top oval (kid-like) — start a touch past the top and don't
    // fully close.
    [{ points: ellipse(50, 50, 26, 34, 0.15, 2 * Math.PI - 0.15, 40, -Math.PI / 2) }],
  ],
  "1": [
    // Plain vertical stroke.
    [{ points: line(50, 20, 50, 80, 20) }],
    // With a serifed flag on top.
    [{ points: line(50, 20, 50, 80, 20) }, { points: line(40, 30, 50, 20, 8) }],
    // With a base serif too — "old-school" 1.
    [
      { points: line(50, 20, 50, 80, 20) },
      { points: line(40, 30, 50, 20, 8) },
      { points: line(42, 80, 58, 80, 8) },
    ],
  ],
  "2": [
    // Single-stroke S-top + straight base.
    [
      {
        points: [
          ...arc(50, 35, 20, Math.PI, 0, 16),
          ...line(70, 35, 30, 80, 20),
          ...line(30, 80, 70, 80, 10),
        ],
      },
    ],
    // Rounder top loop.
    [
      {
        points: [
          ...arc(50, 38, 18, Math.PI + 0.3, -0.3, 18),
          ...line(68, 38, 32, 80, 20),
          ...line(32, 80, 70, 80, 10),
        ],
      },
    ],
    // Flatter base with slight angle.
    [
      {
        points: [
          ...arc(50, 35, 20, Math.PI, 0, 16),
          ...line(70, 35, 32, 80, 20),
          ...line(32, 80, 72, 78, 10),
        ],
      },
    ],
  ],
  "3": [
    // Two stacked half-arcs.
    [
      {
        points: [
          ...arc(50, 35, 18, Math.PI, 0, 14),
          ...arc(50, 35, 18, 0, Math.PI / 2, 8),
          ...arc(50, 65, 18, -Math.PI / 2, Math.PI, 14),
        ],
      },
    ],
    // Wider bottom loop.
    [
      {
        points: [...arc(48, 35, 16, Math.PI, 0, 14), ...arc(50, 65, 20, -Math.PI / 2, Math.PI, 16)],
      },
    ],
    // Slightly spiky version (kid).
    [
      {
        points: [
          ...line(30, 25, 70, 25, 8),
          ...line(70, 25, 50, 50, 8),
          ...arc(50, 65, 18, -Math.PI / 2, Math.PI, 14),
        ],
      },
    ],
  ],
  "4": [
    // Classic 4: vertical down-then-right, then a separate descender.
    [
      { points: [...line(60, 20, 30, 55, 14), ...line(30, 55, 75, 55, 12)] },
      { points: line(65, 30, 65, 80, 18) },
    ],
    // Closed-top 4 (single stroke, no lift).
    [
      {
        points: [
          ...line(60, 20, 30, 55, 14),
          ...line(30, 55, 75, 55, 12),
          ...line(60, 30, 60, 80, 18),
        ],
      },
    ],
    // Open-top kid 4 — same as classic but with a wobblier descender.
    [
      { points: [...line(58, 22, 28, 56, 14), ...line(28, 56, 72, 56, 12)] },
      { points: line(64, 32, 66, 82, 18) },
    ],
  ],
  "5": [
    // Top bar + curl + bottom belly.
    [
      { points: line(70, 22, 35, 22, 10) },
      {
        points: [...line(35, 22, 33, 50, 10), ...arc(50, 60, 18, Math.PI, -Math.PI / 2, 16)],
      },
    ],
    // Single-stroke version (kid).
    [
      {
        points: [
          ...line(70, 22, 32, 22, 10),
          ...line(32, 22, 30, 50, 10),
          ...arc(50, 62, 18, Math.PI, -Math.PI / 2, 16),
        ],
      },
    ],
    // Curvier belly.
    [
      { points: line(72, 22, 34, 22, 10) },
      {
        points: [
          ...line(34, 22, 30, 48, 10),
          ...arc(52, 62, 20, Math.PI - 0.2, Math.PI / 2 - 0.2, 18),
        ],
      },
    ],
  ],
  "6": [
    // Vertical curl into closed loop.
    [
      {
        points: [
          ...arc(50, 50, 30, -Math.PI / 4, Math.PI, 16),
          ...arc(50, 65, 18, Math.PI, 3 * Math.PI, 24),
        ],
      },
    ],
    // Taller hook.
    [
      {
        points: [
          ...arc(55, 50, 32, -Math.PI / 3, Math.PI, 18),
          ...arc(50, 65, 16, Math.PI, 3 * Math.PI, 22),
        ],
      },
    ],
    // Looser loop (kid).
    [
      {
        points: [
          ...arc(50, 48, 28, -Math.PI / 4, Math.PI, 14),
          ...arc(50, 65, 20, Math.PI, 3 * Math.PI - 0.2, 22),
        ],
      },
    ],
  ],
  "7": [
    // Plain top bar + diagonal descender.
    [{ points: [...line(28, 22, 72, 22, 12), ...line(72, 22, 40, 80, 18)] }],
    // With the European crossbar.
    [
      { points: [...line(28, 22, 72, 22, 12), ...line(72, 22, 40, 80, 18)] },
      { points: line(45, 52, 60, 52, 6) },
    ],
    // Slight curve in the descender (kid).
    [
      {
        points: [
          ...line(28, 22, 72, 22, 12),
          ...arc(72, 22, 60, -Math.PI / 2 + 0.1, -Math.PI / 2 + 0.7, 14),
        ],
      },
    ],
  ],
  "8": [
    // Two stacked ovals, single continuous stroke (figure-8).
    [
      {
        points: [
          ...ellipse(50, 35, 16, 16, 0, 2 * Math.PI, 22, Math.PI / 2),
          ...ellipse(50, 65, 18, 18, 0, 2 * Math.PI, 22, -Math.PI / 2),
        ],
      },
    ],
    // Taller top, wider bottom.
    [
      {
        points: [
          ...ellipse(50, 32, 14, 16, 0, 2 * Math.PI, 22, Math.PI / 2),
          ...ellipse(50, 65, 20, 18, 0, 2 * Math.PI, 22, -Math.PI / 2),
        ],
      },
    ],
    // Two separate strokes.
    [
      { points: ellipse(50, 35, 16, 16, 0, 2 * Math.PI, 22, Math.PI / 2) },
      { points: ellipse(50, 65, 18, 18, 0, 2 * Math.PI, 22, -Math.PI / 2) },
    ],
  ],
  "9": [
    // Closed loop on top + descending tail.
    [
      {
        points: [
          ...ellipse(50, 35, 18, 18, 0, 2 * Math.PI, 24, Math.PI / 2),
          ...line(68, 35, 55, 80, 18),
        ],
      },
    ],
    // Smaller head, longer tail.
    [
      {
        points: [
          ...ellipse(50, 32, 16, 16, 0, 2 * Math.PI, 22, Math.PI / 2),
          ...line(66, 32, 52, 82, 20),
        ],
      },
    ],
    // Tail that hooks left at the bottom (common variant).
    [
      {
        points: [
          ...ellipse(50, 35, 18, 18, 0, 2 * Math.PI, 24, Math.PI / 2),
          ...line(68, 35, 52, 78, 16),
          ...arc(52, 78, 6, 0, Math.PI / 2, 6),
        ],
      },
    ],
  ],
};

// Raw stroke sets, exported for tests/visualization/debugging. The
// templates below are built from these at module-load time.
export const BASELINE_DIGIT_STROKES: Readonly<Record<DigitLabel, readonly DigitStrokes[]>> =
  DIGIT_STROKES;

// Build templates at module-load time. Cheap (~30 invocations of
// preprocess, each ~0.1ms) and means the package can be tree-shaken if
// the consuming app doesn't import baselines.
export const BASELINE_DIGIT_TEMPLATES: readonly Template[] = Object.entries(DIGIT_STROKES).flatMap(
  ([label, variants]) =>
    variants.map((strokes, idx) => ({
      ...makeTemplate(label as DigitLabel, strokes, {
        id: `baseline-${label}-${idx}`,
      }),
      // Override the "user" source assigned by makeTemplate — these ship
      // with the package, so they're baseline.
      source: "baseline" as const,
    })),
);

// ─── stroke-coordinate helpers ──────────────────────────────────────────

function line(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  n: number,
): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const t = i / Math.max(1, n - 1);
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  });
}

// Arc on a circle centered at (cx, cy) radius r, from angle startA to
// endA, n samples. Angles are in radians. Y-axis grows DOWN in canvas
// coordinates so a clockwise sweep from "12 o'clock" → "3 o'clock" goes
// from -π/2 (top) to 0 (right) along positive y.
function arc(
  cx: number,
  cy: number,
  r: number,
  startA: number,
  endA: number,
  n: number,
): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const t = i / Math.max(1, n - 1);
    const a = startA + t * (endA - startA);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
}

// Ellipse with independent rx, ry and an optional rotation offset.
function ellipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  startA: number,
  endA: number,
  n: number,
  rotation = 0,
): { x: number; y: number }[] {
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);
  return Array.from({ length: n }, (_, i) => {
    const t = i / Math.max(1, n - 1);
    const a = startA + t * (endA - startA);
    const x0 = rx * Math.cos(a);
    const y0 = ry * Math.sin(a);
    return { x: cx + x0 * cosR - y0 * sinR, y: cy + x0 * sinR + y0 * cosR };
  });
}
