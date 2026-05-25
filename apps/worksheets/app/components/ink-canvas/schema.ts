import { StrokeSchema } from "@dean-stack/handwriting-recognizer";
import * as z from "zod";

// Public props for InkCanvas. The component is unopinionated about
// recognition — it just emits Strokes when the kid lifts the pencil
// (after `endStrokeAfterMs` of inactivity). AnswerCell wraps it with
// the recognizer + IDB persistence.
//
// `inputModes` is the list of PointerEvent.pointerType values to accept.
// Default is just "pen" — palm/touch is silently ignored. In dev, set to
// ["pen", "mouse"] so the same component works in Storybook on a desktop.
export const InkCanvasPropsSchema = z.object({
  // Canvas size in CSS pixels. Always paints crisp on Retina (2x) via
  // internal DPR scaling.
  width: z.number().positive(),
  height: z.number().positive(),
  // Pointer types accepted as ink input. Default "pen" matches the iPad
  // workflow; Storybook overrides with ["pen", "mouse"].
  inputModes: z.array(z.enum(["pen", "mouse", "touch"])).default(["pen"]),
  // ms of no pointer activity that signals "user is done with this
  // multi-stroke gesture, send it for recognition." 600ms matches the
  // upstream $1 / $P recommendation and the typical adult/kid pause
  // between drawing a 4's crossbar and finishing.
  endStrokeAfterMs: z.number().int().min(50).max(5000).default(600),
  // Color of the ink trail.
  inkColor: z.string().default("#1f1f3f"),
  // Initial strokes to render (replay from IDB). The kid can keep adding
  // strokes; the callback re-fires with the cumulative list on each
  // pen-up debounce.
  initialStrokes: z.array(StrokeSchema).default([]),
  // Fired when the user lifts the pen + `endStrokeAfterMs` passes. The
  // argument is the FULL accumulated stroke set (including initialStrokes
  // and anything drawn since), suitable for recognize().
  onStrokesComplete: z
    .custom<(strokes: readonly z.infer<typeof StrokeSchema>[]) => void>()
    .optional(),
  // Fired when the kid taps "clear" — handled by the parent (AnswerCell)
  // since the canvas itself doesn't render UI chrome.
  onClear: z.custom<() => void>().optional(),
  // When true, the canvas fades to opacity 0 (CSS transition). Used by
  // AnswerCell to hide the strokes once recognition has produced a
  // clean digit overlay. Declarative — no imperative DOM querying.
  faded: z.boolean().optional(),
});
