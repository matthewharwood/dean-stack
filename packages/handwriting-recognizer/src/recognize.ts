import { cloudDistance, MAX_CLOUD_DISTANCE, preprocess } from "./pdollar";
import type { DigitLabel, RecognitionResult, Stroke, Template } from "./schema";

// Confidence-gating defaults, calibrated against the baseline distance
// matrix (see diagnostic.test.ts).
//
// MIN_SCORE — the absolute floor. Below this, no template was close
// enough; we return label: null and confident: false. With MAX_CLOUD_-
// DISTANCE=3.0, scores in [0.5, 1.0] map to weighted-sum distances in
// [0, 1.5] — i.e. "the candidate's strokes are demonstrably closer to
// THIS digit's templates than to a random scribble." Kid handwriting
// against day-1 synthetic baselines comfortably clears 0.5; perfect
// matches (kid copies a template byte-for-byte) score 1.0.
//
// MIN_GAP — the winner must be ahead of the runner-up by at least this
// margin. A 6 and an 8 that both score 0.55 would otherwise both
// "win" the gate ambiguously; the gap forces a clean separation. Small
// gap (0.05) trusts the scoring; raise it if you see flicker between
// two adjacent-looking digits.
export const DEFAULT_MIN_SCORE = 0.5;
export const DEFAULT_MIN_GAP = 0.05;

export type RecognizeOptions = {
  minScore?: number;
  minGap?: number;
};

// Wrap a multi-stroke gesture + a flat list of templates and return the
// best match (or null + low score). Templates are already normalized; the
// incoming gesture is preprocessed on every call (cheap — ~0.1ms per
// digit on a 6yo iPad).
export function recognize(
  strokes: readonly Stroke[],
  templates: readonly Template[],
  options: RecognizeOptions = {},
): RecognitionResult {
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  const minGap = options.minGap ?? DEFAULT_MIN_GAP;

  if (strokes.length === 0 || templates.length === 0) {
    return { label: null, score: 0, runnerUp: null, confident: false };
  }

  const candidate = preprocess(strokes);
  if (candidate.length < 2) {
    return { label: null, score: 0, runnerUp: null, confident: false };
  }

  // Score every template, then collapse to "best score per label" so
  // multiple-template-per-digit doesn't double-vote — for label "7" with
  // three templates we take whichever scored best.
  const scoresByLabel = new Map<DigitLabel, number>();
  for (const tpl of templates) {
    const d = cloudDistance(candidate, tpl.points);
    const score = scoreFromDistance(d);
    const prev = scoresByLabel.get(tpl.label);
    if (prev === undefined || score > prev) {
      scoresByLabel.set(tpl.label, score);
    }
  }

  // Rank labels by best score.
  const ranked = Array.from(scoresByLabel.entries())
    .map(([label, score]) => ({ label, score }))
    .sort((a, b) => b.score - a.score);

  const winner = ranked[0];
  if (!winner) {
    return { label: null, score: 0, runnerUp: null, confident: false };
  }
  const runner = ranked[1] ?? null;

  const confident =
    winner.score >= minScore && (runner === null || winner.score - runner.score >= minGap);

  return {
    label: confident ? winner.label : null,
    score: winner.score,
    runnerUp: runner,
    confident,
  };
}

// Distance → score. 0 distance is a perfect match → score 1.0; the
// theoretical worst distance (~0.707) → score 0.0.
function scoreFromDistance(d: number): number {
  const raw = 1 - d / MAX_CLOUD_DISTANCE;
  if (raw < 0) return 0;
  if (raw > 1) return 1;
  return raw;
}

// Build a Template from raw user strokes + a label. Use this when
// promoting a misread stroke to a new training example — the app passes
// in the strokes it just captured and the digit the parent confirmed.
//
// Returns a Template with `source: "user"`, freshly normalized.
export function makeTemplate(
  label: DigitLabel,
  strokes: readonly Stroke[],
  options: { id?: string } = {},
): Template {
  const points = preprocess(strokes);
  if (points.length < 2) {
    throw new Error("makeTemplate: gesture has too few points after preprocess");
  }
  return {
    id: options.id ?? `user-${label}-${Date.now().toString(36)}`,
    label,
    points,
    source: "user",
    createdAt: new Date().toISOString(),
  };
}
