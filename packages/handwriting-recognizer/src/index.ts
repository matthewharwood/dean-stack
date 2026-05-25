// @dean-stack/handwriting-recognizer
//
// A small, dependency-light point-cloud handwriting recognizer for kids
// drawing single digits with an Apple Pencil. Runs 100% in-browser, no
// WASM, no model weights, deploys cleanly to GitHub Pages.
//
// See ./pdollar.ts for the algorithm pedigree (Vatavu/Anthony/Wobbrock,
// $P+ variant of $P / $Q point-cloud recognizers — BSD-3 upstream).
//
// Public surface:
//   - recognize(strokes, templates, options?)         — main inference call
//   - makeTemplate(label, strokes)                    — promote a stroke to a template
//   - preprocess(strokes)                             — exposed for visualization/debugging
//   - All Zod schemas + inferred types
//
// Subpath export:
//   - "@dean-stack/handwriting-recognizer/baselines"  — baseline digit
//     templates suitable for app cold-start before the user has any of
//     their own templates yet.

// Re-export baselines from the top-level so consumers can do either
// `import { BASELINE_DIGIT_TEMPLATES } from "@dean-stack/handwriting-recognizer"`
// or, if they want to tree-shake the ~30-template payload out, the
// `/baselines` subpath. The subpath is the bundle-optimized form.
export { BASELINE_DIGIT_STROKES, BASELINE_DIGIT_TEMPLATES } from "./baselines/digits";

export {
  cloudDistance,
  MAX_CLOUD_DISTANCE,
  preprocess,
  RESAMPLE_N,
} from "./pdollar";
export {
  DEFAULT_MIN_GAP,
  DEFAULT_MIN_SCORE,
  makeTemplate,
  type RecognizeOptions,
  recognize,
} from "./recognize";
export {
  type DigitLabel,
  DigitLabelSchema,
  type Point,
  PointSchema,
  type RecognitionResult,
  RecognitionResultSchema,
  type Stroke,
  StrokeSchema,
  type Template,
  TemplateSchema,
  type TemplateSet,
  TemplateSetSchema,
} from "./schema";
