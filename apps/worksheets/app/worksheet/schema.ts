import * as z from "zod";

// ─── Primitives ────────────────────────────────────────────────────────────
// Reuse the game's semantic names ("add", "subtract", "multiply") for
// cross-referencing with the Halidzone source-of-truth. The renderer maps
// these to display symbols (+, −, ×) at the component layer.

export const WorksheetOperatorSchema = z.enum(["add", "subtract", "multiply"]);

export const WorksheetComparatorSchema = z.enum(["eq", "gt", "lt"]);

// On paper, the game's 7 equation shapes collapse to 4 rendering patterns.
// The kid's pencil does the work the game's drag/stepper/multi-choice did.
export const PaperShapeSchema = z.enum([
  // `__ ? __ cmp N` — both operands blank, kid picks any valid pair (R1–R4)
  "fill-pair",
  // `M ? __ = __` — one operand locked, kid fills both the addend and the
  // result; the two blanks must agree. (R5–R8 find-missing-result)
  "fill-consistent-pair",
  // Single missing number anywhere in `a ? b = c`. Covers stepper-sum (R9–R11),
  // find-missing-factor (R13), find-leading-factor (R14), find-product (R15).
  "fill-blank",
  // `a × b = c ?` — circle TRUE or FALSE (R12)
  "true-false",
]);
export const VariantSchema = z.enum(["A", "B", "C"]);
export type Variant = z.infer<typeof VariantSchema>;

// Which slot in `a OP b = c` is the blank for fill-blank problems.
export const BlankPositionSchema = z.enum(["a", "b", "c"]);

// ─── Stage ─────────────────────────────────────────────────────────────────
// One Stage per Halidzone round (15 total). Configuration only — no problems.
// Problems are generated from this + a seed.

export const StageIdSchema = z.string().regex(/^s(?:[1-9]|1[0-5])$/, "stageId must be s1..s15");

export const ValueRangeSchema = z
  .object({ min: z.int(), max: z.int() })
  .refine((r) => r.min <= r.max, { message: "min must be <= max" });

export const StageSchema = z.object({
  id: StageIdSchema,
  // 1..15 — display order, mirrors the game round number
  ordinal: z.int().min(1).max(15),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  // Kid-facing 1-2 sentence framing for the worksheet header — the long form,
  // used when the short Field Log brief isn't set. Stays around as the
  // accessible long-description for SEO meta as well.
  introCopy: z.string().min(20),
  // Single in-world sentence framing the stage as a mission in Halidzone.
  // Replaces introCopy in the on-page intro when present. Calvin's #2 idea —
  // a one-sentence brief carries more narrative weight than a paragraph
  // because the *recurrence* is what's load-bearing, not the word count.
  fieldLog: z.string().min(4).max(140).optional(),
  // Single imperative shown above the problems ("Fill in the missing number.")
  instruction: z.string().min(8),
  paperShape: PaperShapeSchema,
  // For mixed-operator stages (R3, R4, R11) we set "multi" and the generator
  // picks per-problem from the allowed set.
  operator: z.union([WorksheetOperatorSchema, z.literal("mixed-add-sub")]),
  // For R3/R4 inequality stages.
  comparator: z.union([WorksheetComparatorSchema, z.literal("mixed-gt-lt")]),
  // Range for randomly-picked operands.
  operandRange: ValueRangeSchema,
  // Range for the target/result, used differently by paperShape.
  resultRange: ValueRangeSchema,
  // For fill-consistent-pair: bounds for the locked operand.
  lockedOperandRange: ValueRangeSchema.optional(),
  // Which position is locked when paperShape = fill-consistent-pair.
  lockedPosition: z.enum(["a", "b"]).optional(),
  // For fill-blank: which slot is the blank (R9–R11: "b", R13: "b", R14: "a",
  // R15: "c"). When "mixed-blank" the generator may vary per problem; not used
  // by any current stage but the door is open.
  blankPosition: BlankPositionSchema.optional(),
  // How many problems on a printed worksheet. 12 keeps each row spacious on
  // a Letter page; some stages override to 10/15 based on visual density.
  problemCount: z.int().min(4).max(30),
});
export type Stage = z.infer<typeof StageSchema>;

// ─── Problem (discriminated union) ─────────────────────────────────────────

const ProblemBaseSchema = z.object({
  // Stable per-worksheet id (e.g., "p1", "p2"). Used as React key + answer key
  // cross-reference. NOT globally unique across worksheets — that's by design;
  // the (worksheetSlug, problemId) pair is the identity.
  id: z.string().regex(/^p\d+$/),
  index: z.int().min(0),
});

export const FillPairProblemSchema = ProblemBaseSchema.extend({
  kind: z.literal("fill-pair"),
  operator: WorksheetOperatorSchema,
  comparator: WorksheetComparatorSchema,
  // The target shown on the page ("__ + __ = 7"). For gt/lt the target is the
  // bound ("__ + __ > 5").
  target: z.int(),
  // One valid solution; useful for the answer key (we just show the canonical
  // pair we generated, even though for inequalities many pairs work).
  answer: z.object({ a: z.int(), b: z.int() }),
});
export type FillPairProblem = z.infer<typeof FillPairProblemSchema>;

export const FillConsistentPairProblemSchema = ProblemBaseSchema.extend({
  kind: z.literal("fill-consistent-pair"),
  operator: WorksheetOperatorSchema,
  // The locked operand and its slot. The other operand + result are blanks
  // the kid fills, and they must be self-consistent.
  locked: z.object({ position: z.enum(["a", "b"]), value: z.int() }),
  // Canonical answer pair (what we generated as the "intended" solution).
  answer: z.object({ otherOperand: z.int(), result: z.int() }),
});
export type FillConsistentPairProblem = z.infer<typeof FillConsistentPairProblemSchema>;

export const FillBlankProblemSchema = ProblemBaseSchema.extend({
  kind: z.literal("fill-blank"),
  operator: WorksheetOperatorSchema,
  a: z.int(),
  b: z.int(),
  c: z.int(),
  blank: BlankPositionSchema,
  // The numeric answer (the value at `blank`).
  answer: z.int(),
});
export type FillBlankProblem = z.infer<typeof FillBlankProblemSchema>;

export const TrueFalseProblemSchema = ProblemBaseSchema.extend({
  kind: z.literal("true-false"),
  operator: z.literal("multiply"),
  a: z.int(),
  b: z.int(),
  claimedResult: z.int(),
  actualResult: z.int(),
  answer: z.boolean(),
});
export type TrueFalseProblem = z.infer<typeof TrueFalseProblemSchema>;

export const ProblemSchema = z.discriminatedUnion("kind", [
  FillPairProblemSchema,
  FillConsistentPairProblemSchema,
  FillBlankProblemSchema,
  TrueFalseProblemSchema,
]);
export type Problem = z.infer<typeof ProblemSchema>;

// ─── Worksheet + AnswerKey ─────────────────────────────────────────────────

export const WorksheetSchema = z.object({
  stageId: StageIdSchema,
  variant: VariantSchema,
  // The numeric seed actually used (derived from hash(stageId, variant)).
  // Exposed for debugging — "if your worksheet's seed is 1234567 you can
  // reproduce it deterministically."
  seed: z.int().nonnegative(),
  // The full Stage descriptor as it was at generation time. Snapshotting here
  // means an answer-key tab opened from a stale worksheet still grades right.
  stage: StageSchema,
  problems: z.array(ProblemSchema).min(1),
});
export type Worksheet = z.infer<typeof WorksheetSchema>;

// Answer key is a deliberately separate shape so renderers can't accidentally
// leak answers into the kid's worksheet view. If a component takes Worksheet,
// it has the answers; if it takes only StripeProblems, it cannot.
export const AnswerKeyEntrySchema = z.object({
  id: z.string(),
  index: z.int(),
  // Rendered as plain text in the answer key (e.g., "3 + 4 = 7" or "TRUE").
  display: z.string(),
});
export type AnswerKeyEntry = z.infer<typeof AnswerKeyEntrySchema>;

export const AnswerKeySchema = z.object({
  worksheetSlug: z.string(),
  stageTitle: z.string(),
  variant: VariantSchema,
  entries: z.array(AnswerKeyEntrySchema).min(1),
});
export type AnswerKey = z.infer<typeof AnswerKeySchema>;
