import { StrokeSchema, TemplateSetSchema } from "@dean-stack/handwriting-recognizer";
import * as z from "zod";

// "print" — paper rendering, no ink capture (default)
// "ipad" — every blank becomes an ink-capture cell; the kid writes with
// an Apple Pencil and the recognizer grades after submission.
export const InkModeSchema = z.enum(["print", "ipad"]);

// Single-row record per IDB store key. Keying the InkModeSettings as a
// fixed id lets us use the same `getDB().get("ink-mode", "settings")`
// shape we use elsewhere.
export const InkModeSettingsSchema = z.object({
  id: z.literal("settings").default("settings"),
  mode: InkModeSchema.default("print"),
});
export type InkModeSettings = z.infer<typeof InkModeSettingsSchema>;
export const INK_MODE_SETTINGS_DEFAULT: InkModeSettings = InkModeSettingsSchema.parse({});

// The accumulated template set — one row, id "templates". Baseline
// templates ship as constants in the recognizer package; on first run
// hydration seeds this row with them, and the worksheet app appends
// user templates over time as the kid plays.
export const TemplateSetRowSchema = z.object({
  id: z.literal("templates").default("templates"),
  set: TemplateSetSchema,
});
export type TemplateSetRow = z.infer<typeof TemplateSetRowSchema>;

// Per-problem captured strokes + recognized digit. Stored as the kid
// writes so a reload doesn't lose progress (Pillar 3 in iPad mode).
// `digit` is null when nothing has been recognized yet OR when the
// recognizer flagged the strokes as low-confidence (the answer cell
// shows a "?" and the parent has to OK a manual override or have the
// kid rewrite). `score` is preserved for the grading layer to surface.
// Loosened from `^p\d+$` to allow per-slot suffixes (`p1_a`, `p1_b`) so
// multi-blank problems can persist one capture per blank. The grader
// only auto-grades the base `p\d+` form (fill-blank, single answer);
// suffixed entries are stored but treated as manual-review.
export const CapturedAnswerSchema = z.object({
  problemId: z.string().regex(/^p\d+(?:_[a-z]+)?$/),
  strokes: z.array(StrokeSchema),
  digit: z.string().regex(/^\d$/).nullable(),
  score: z.number().min(0).max(1).default(0),
  confident: z.boolean().default(false),
});

// Per-worksheet (per stage × variant) answer set. Key in IDB is
// `${stageId}-${variant}`. `entries` is keyed by problemId.
export const WorksheetAnswersSchema = z.object({
  id: z.string().regex(/^s(?:[1-9]|1[0-5])-[ABC]$/),
  entries: z.record(z.string(), CapturedAnswerSchema).default({}),
  submittedAt: z.string().optional(),
});
export type WorksheetAnswers = z.infer<typeof WorksheetAnswersSchema>;
