import * as z from "zod";

// A single sampled point along an inking stroke. `t` is the wall-clock
// timestamp (ms since epoch) at sample time — the $P+ algorithm itself
// is timing-independent, but we keep timestamps so the calling app can
// reconstruct stroke order / decide stroke-end debouncing.
//
// `pressure` is optional because Apple Pencil USB-C (and ordinary mouse
// input in dev) do not provide it. When undefined we treat all samples
// as full-pressure for rendering width.
export const PointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  t: z.number().nonnegative().optional(),
  pressure: z.number().min(0).max(1).optional(),
});
export type Point = z.infer<typeof PointSchema>;

// One pen-down → pen-up sequence. A multi-stroke digit (a 4 with the
// crossbar lifted, a 7 with the foot lifted) is an array of these.
export const StrokeSchema = z.object({
  points: z.array(PointSchema).min(1),
});
export type Stroke = z.infer<typeof StrokeSchema>;

// Digit-only classifier; the package is generic enough to add letters or
// symbols later, but the worksheets app only needs 0-9 today.
export const DigitLabelSchema = z.enum(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
export type DigitLabel = z.infer<typeof DigitLabelSchema>;

// A template = the strokes the recognizer compares an incoming gesture
// against. `points` is ALREADY normalized (resampled to N=32 and scaled
// to unit bbox by the preprocessor) so adding a template at runtime is
// just `recognizer.makeTemplate(label, rawStrokes)` → store this shape.
//
// `source` lets us track provenance for the auto-prune logic (when a
// user-promoted template proves to be wrong, distinguish it from a
// ship-as-baseline template we shouldn't touch).
export const TemplateSchema = z.object({
  id: z.string().min(1),
  label: DigitLabelSchema,
  // Already-preprocessed point cloud — equal-arc resampled, centroid
  // translated to origin, longest bbox axis scaled to 1.0.
  points: z.array(PointSchema).min(2),
  // Where this template came from. "baseline" templates ship with the
  // package; "user" templates are added at runtime via the worksheet app.
  source: z.enum(["baseline", "user"]).default("baseline"),
  // ISO timestamp captured at template creation time, helpful for the
  // dev-menu "manage my templates" UI.
  createdAt: z.string().optional(),
});
export type Template = z.infer<typeof TemplateSchema>;

export const TemplateSetSchema = z.object({
  // Schema version — lets the app run a migration if we ever change the
  // preprocessing pipeline (different N, different normalization, etc.)
  // and need to invalidate cached user templates.
  version: z.literal(1).default(1),
  templates: z.array(TemplateSchema).default([]),
});
export type TemplateSet = z.infer<typeof TemplateSetSchema>;

export const RecognitionResultSchema = z.object({
  // Best-match digit, or null if no template was close enough.
  label: DigitLabelSchema.nullable(),
  // Match score in [0, 1] where 1.0 is a perfect template match.
  // For $P+ this is the normalized-distance complement: 1 - (distance / scale).
  score: z.number().min(0).max(1),
  // Second-best match — used by the confidence-gating layer to require
  // that the winner is decisively ahead of the runner-up.
  runnerUp: z
    .object({
      label: DigitLabelSchema,
      score: z.number().min(0).max(1),
    })
    .nullable(),
  // True when score >= MIN_SCORE AND (score - runnerUp.score) >= MIN_GAP.
  // Computed by recognize() so the app doesn't have to re-derive it.
  confident: z.boolean(),
});
export type RecognitionResult = z.infer<typeof RecognitionResultSchema>;
