// $P+ Point-Cloud Recognizer — TypeScript port of the reference algorithm
// from the University of Washington's AIM Lab.
//
// Algorithm: Vatavu, R.-D., Anthony, L., Wobbrock, J. O. (2018)
//   "$Q: A Super-Quick, Articulation-Invariant Stroke-Gesture Recognizer
//    for Low-Resource Devices"
// Predecessor: Vatavu, Anthony, Wobbrock (2012) — "$P Point-Cloud Recognizer"
//
// Reference implementation: https://depts.washington.edu/acelab/proj/dollar/
// License of the upstream reference JS: BSD-3-Clause (see UW ACE lab page).
//
// This port keeps the algorithm's semantics intact but:
//   - Uses ES modules and TypeScript types
//   - Operates on the package's Point/Stroke types (not the upstream Point class)
//   - Exposes pure functions (resample, normalize, cloud-match) so the
//     recognize() layer can compose them and store pre-normalized templates
//
// The algorithm in one paragraph: for each stroke gesture, resample to N
// equally-spaced points along the arc length, translate the centroid to
// origin, then scale so the longest bbox axis is 1.0. Compare two clouds
// by an *approximated* Hungarian matching (greedy with weighted distances)
// — for each point in cloud A, find the nearest unmatched point in cloud B,
// weighted by how early in the iteration we picked it. Sum the weighted
// distances; the lower the sum, the better the match.

import type { Point, Stroke } from "./schema";

// N is the resample target. The upstream paper recommends 32 — small
// enough to be fast on weak hardware, large enough to preserve digit shape.
export const RESAMPLE_N = 32;

// Convert a multi-stroke gesture into a single normalized point cloud.
// Each point inherits an integer `strokeId` so the cloud-match can prefer
// matching points from the same stroke (a digit-4 crossbar shouldn't
// match the upright stem). The upstream algorithm uses the `id` field for
// this; we collapse it onto the point's index after resampling.
export function preprocess(strokes: readonly Stroke[]): Point[] {
  const points = flattenWithStrokeIds(strokes);
  if (points.length < 2) return points.map((p) => ({ ...p }));
  const resampled = resample(points, RESAMPLE_N);
  const translated = translateToOrigin(resampled);
  return scaleToUnit(translated);
}

// Compare a candidate cloud against a template cloud. Returns the
// $P+ "distance" (a weighted sum across nearest-neighbor pairings,
// lower is better). The recognize() layer turns this into a [0, 1]
// score by `1 - distance / MAX_CLOUD_DISTANCE`.
//
// Tries multiple starting indices on each direction per the $P paper
// (Algorithm 1 — start step = floor(n^(1-ε)) with ε=0.5). This gives
// rotation invariance in stroke ORDER (kid drawing a "0" starting at
// the top vs the bottom should still match a template that starts at
// the top). Without this, the recognizer is brittle to stroke-start
// position.
export function cloudDistance(candidate: readonly Point[], template: readonly Point[]): number {
  const n = candidate.length;
  if (n === 0 || template.length === 0) return Number.POSITIVE_INFINITY;
  const step = Math.max(1, Math.floor(Math.sqrt(n)));
  let best = Number.POSITIVE_INFINITY;
  for (let start = 0; start < n; start += step) {
    const d1 = greedyCloudMatch(candidate, template, start);
    const d2 = greedyCloudMatch(template, candidate, Math.min(start, template.length - 1));
    if (d1 < best) best = d1;
    if (d2 < best) best = d2;
  }
  return best;
}

// Score denominator. Empirically chosen from the baseline distance
// matrix (see diagnostic.test.ts): typical cross-digit distances land
// in the 2-5 range, self-matches at 0, noisy-self at 0.5-1.5. A
// denominator of 3.0 puts noisy-self scores in [0.5, 1.0] and most
// cross-digit scores below 0.5 — clean separation for MIN_SCORE=0.5.
//
// The upstream $P paper hardcodes 2.0 here, which is too tight for
// kid handwriting against synthetic baselines (it would clamp most
// matches to zero, mirroring the "always returns the first iterated
// template" bug we just fixed). 3.0 is the sweet spot for day-1
// accuracy; as the kid's own templates accumulate via the picker, the
// effective distances tighten and any denominator > 2.0 still works.
export const MAX_CLOUD_DISTANCE = 3.0;

// ─── internals ───────────────────────────────────────────────────────────

// Flatten the strokes into a single sequence, but attach a strokeId hash
// in `t` (we reuse the `t` field as a transient strokeId carrier — the
// timing data is irrelevant for the cloud match, and adding a new field
// would force a schema fork. The resample step reads strokeId from t and
// then sets t to undefined.)
function flattenWithStrokeIds(strokes: readonly Stroke[]): Point[] {
  const out: Point[] = [];
  for (let s = 0; s < strokes.length; s++) {
    const stroke = strokes[s];
    if (!stroke) continue;
    for (const pt of stroke.points) {
      out.push({ x: pt.x, y: pt.y, t: s });
    }
  }
  return out;
}

// Equal-arc-length resample. Walks the cumulative path length and emits
// a sample every (totalLength / (n - 1)) units, interpolating between the
// two source points that bracket each target distance.
function resample(points: readonly Point[], n: number): Point[] {
  const interval = pathLength(points) / (n - 1);
  let accumulated = 0;
  const out: Point[] = [
    { x: nonNull(points[0]).x, y: nonNull(points[0]).y, t: nonNull(points[0]).t },
  ];
  const buf: Point[] = points.map((p) => ({ ...p }));
  for (let i = 1; i < buf.length; i++) {
    const prev = nonNull(buf[i - 1]);
    const cur = nonNull(buf[i]);
    // Only resample within a contiguous stroke; gap detection by strokeId.
    if (prev.t !== cur.t) {
      out.push({ x: cur.x, y: cur.y, t: cur.t });
      continue;
    }
    const d = distance(prev, cur);
    if (accumulated + d >= interval) {
      const ratio = (interval - accumulated) / d;
      const nx = prev.x + ratio * (cur.x - prev.x);
      const ny = prev.y + ratio * (cur.y - prev.y);
      const newPt: Point = { x: nx, y: ny, t: cur.t };
      out.push(newPt);
      buf.splice(i, 0, newPt);
      accumulated = 0;
    } else {
      accumulated += d;
    }
  }
  // Floating-point error can leave us one point short; pad with the last.
  while (out.length < n) {
    const last = out[out.length - 1];
    if (!last) break;
    out.push({ x: last.x, y: last.y, t: last.t });
  }
  return out.slice(0, n);
}

function pathLength(points: readonly Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = nonNull(points[i - 1]);
    const cur = nonNull(points[i]);
    if (prev.t === cur.t) total += distance(prev, cur);
  }
  return total;
}

function translateToOrigin(points: readonly Point[]): Point[] {
  const c = centroid(points);
  return points.map((p) => ({ ...p, x: p.x - c.x, y: p.y - c.y }));
}

function scaleToUnit(points: readonly Point[]): Point[] {
  const { minX, maxX, minY, maxY } = bbox(points);
  const size = Math.max(maxX - minX, maxY - minY);
  if (size === 0) return points.map((p) => ({ ...p }));
  return points.map((p) => ({ ...p, x: p.x / size, y: p.y / size }));
}

// The greedy match — for each point in `a` starting at `start` (and
// wrapping mod n), find the nearest unmatched point in `b`. The early
// iterations get heavier weights (1 at iteration 0, decaying to 1/n at
// the last), so "easy" pairings dominate the score. Iterating over
// multiple `start` values (caller's responsibility) makes the result
// rotation-invariant in stroke ORDER.
function greedyCloudMatch(a: readonly Point[], b: readonly Point[], start: number): number {
  const n = a.length;
  if (n === 0 || b.length === 0) return Number.POSITIVE_INFINITY;
  const matched = new Array<boolean>(b.length).fill(false);
  let sum = 0;
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    let minDist = Number.POSITIVE_INFINITY;
    let minIdx = -1;
    for (let j = 0; j < b.length; j++) {
      if (matched[j]) continue;
      const d = distance(nonNull(a[i]), nonNull(b[j]));
      if (d < minDist) {
        minDist = d;
        minIdx = j;
      }
    }
    if (minIdx === -1) break;
    matched[minIdx] = true;
    const weight = 1 - k / n;
    sum += weight * minDist;
  }
  return sum;
}

function centroid(points: readonly Point[]): Point {
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  const n = points.length || 1;
  return { x: sx / n, y: sy / n };
}

function bbox(points: readonly Point[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function nonNull<T>(v: T | undefined): T {
  if (v === undefined) throw new Error("internal: unexpected undefined point");
  return v;
}
