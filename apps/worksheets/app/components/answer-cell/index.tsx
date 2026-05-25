import {
  type DigitLabel,
  DigitLabelSchema,
  makeTemplate,
  recognize,
  type Stroke,
} from "@dean-stack/handwriting-recognizer";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { Eraser, Pencil } from "lucide-react";
import { type ReactNode, useCallback, useRef, useState } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import {
  answersAtomForWorksheet,
  appendUserTemplateAtom,
  templatesAtom,
  updateAnswerAtom,
} from "~/state/ink-atoms";

import { InkCanvas } from "../ink-canvas";

export const AnswerCellPropsSchema = z.object({
  // Worksheet id (`${stageId}-${variant}`) — used to read AND write
  // the per-worksheet answers atom.
  worksheetId: z.string().regex(/^s(?:[1-9]|1[0-5])-[ABC]$/),
  // Problem id within the worksheet (e.g. "p1", or `p3_a` for the first
  // blank of a multi-blank problem). Used as the entries key + as the
  // React key for the canvas instance.
  problemId: z.string().regex(/^p\d+(?:_[a-z]+)?$/),
  // CSS pixel size of the writing area.
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  // Allow mouse input in dev/Storybook; pen-only on iPad.
  inputModes: z.array(z.enum(["pen", "mouse", "touch"])).optional(),
});

// Local view state. `phase` drives the ink→digit morph + the override
// picker; `displayedDigit` is the digit currently shown to the kid AND
// the value the grader will read. `score` is preserved purely for
// telemetry (the grader doesn't use it).
type CellPhase =
  | { kind: "empty" }
  | { kind: "ink" } // strokes captured, recognition not yet fired
  | { kind: "morphing"; digit: DigitLabel | null; score: number } // 280ms ink-out / digit-in
  | { kind: "settled"; digit: DigitLabel | null; score: number; source: "auto" | "manual" }
  | { kind: "overriding"; previousDigit: DigitLabel | null }; // picker open

const DIGIT_CHOICES: readonly DigitLabel[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

// Replaces the printed `.blank` with an inkable cell. Flow:
//   1. Kid draws strokes → InkCanvas captures them.
//   2. 600ms after pen-up → recognizer fires, `phase` flips to "morphing".
//   3. Ink fades out (CSS transition on the canvas) while the recognized
//      digit fades in over the same beat (opacity + scale). 280ms total.
//   4. `phase` flips to "settled". The shown digit IS the answer the
//      grader reads. The kid can tap the cell to clear + retry, or tap
//      the small pencil to open a 0-9 picker and manually override.
//
// "Not confident" is no longer a separate UI mode — the recognizer's
// best guess is always shown. Trust the kid to either accept it visually
// or override via the picker. This collapses the previous thumbs-up
// runner-up flow into one consistent gesture.
//
// Pillar 3: every stroke + recognition result is persisted via
// updateAnswerAtom() → atomWithIDB → IDB. A reload mid-worksheet picks
// up exactly where the kid left off.
export const AnswerCell = defineComponent(AnswerCellPropsSchema, (props): ReactNode => {
  const { worksheetId, problemId, width = 72, height = 88, inputModes = ["pen", "mouse"] } = props;

  const templateSet = useAtomValue(templatesAtom());
  const setAnswer = useSetAtom(updateAnswerAtom(worksheetId));
  const appendTemplate = useSetAtom(appendUserTemplateAtom());
  // useStore lets us READ the answers atom ONCE on mount (for state
  // hydration from IDB) without subscribing the component to every
  // atom change. Subscribing would re-render this cell whenever any
  // OTHER cell on the worksheet writes — fine functionally but wasted
  // work across 12-15 cells per page.
  const store = useStore();

  // Hydrate phase + strokes from the persisted atom on first mount.
  // The atom was hydrated from IDB at app startup (see hydration.ts +
  // installInkAtoms in __root.tsx), so reading here picks up exactly
  // what the kid wrote on a previous session. Previously the cell read
  // initial state from PROPS that the parent never passed → the cell
  // always started "empty" regardless of what was in IDB. That was the
  // root cause of the "refreshing loses my numbers" bug.
  const persistedEntry = store.get(answersAtomForWorksheet(worksheetId)).entries[problemId];
  const initialStrokesRef = useRef<readonly Stroke[]>(
    (persistedEntry?.strokes ?? []) as readonly Stroke[],
  );
  const [phase, setPhase] = useState<CellPhase>(() => {
    if (persistedEntry?.digit) {
      return {
        kind: "settled",
        digit: persistedEntry.digit as DigitLabel,
        score: persistedEntry.score,
        source: "auto",
      };
    }
    if (persistedEntry?.strokes.length) return { kind: "ink" };
    return { kind: "empty" };
  });
  const lastStrokesRef = useRef<readonly Stroke[]>(
    (persistedEntry?.strokes ?? []) as readonly Stroke[],
  );

  const cellSelector = `[data-cell-id="${worksheetId}:${problemId}"]`;

  const writeAnswer = useCallback(
    (digit: DigitLabel | null, score: number, strokes: readonly Stroke[]): void => {
      setAnswer({
        problemId,
        strokes: strokes.map((s) => ({ points: s.points.map((p) => ({ ...p })) })),
        digit,
        score,
        // `confident` is true once a digit is shown — the kid implicitly
        // confirmed by not overriding, or explicitly via the picker.
        // Recognition score is preserved separately for telemetry.
        confident: digit !== null,
      });
    },
    [problemId, setAnswer],
  );

  const handleStrokes = useCallback(
    (strokes: readonly Stroke[]): void => {
      lastStrokesRef.current = strokes;
      if (strokes.length === 0) {
        setPhase({ kind: "empty" });
        writeAnswer(null, 0, []);
        return;
      }
      const r = recognize(strokes, templateSet.set.templates);
      // recognize() returns label:null only when no template was even
      // close (score below MIN_SCORE). Fall back to the runner-up if
      // present so the kid always sees SOME guess; if nothing matched
      // at all, prompt the kid to tell us what they wrote via the
      // override picker.
      const fallback: DigitLabel | null = r.label ?? r.runnerUp?.label ?? null;
      if (fallback === null) {
        // Nothing the algorithm can confidently call — open the picker
        // so the kid can label their own stroke. The canvas fades via
        // the `faded` prop driven by phase.kind below.
        setPhase({ kind: "overriding", previousDigit: null });
        writeAnswer(null, r.score, strokes);
        return;
      }
      setPhase({ kind: "morphing", digit: fallback, score: r.score });
      // After the morph beat, settle into the final state. The 300ms
      // delay slightly outlasts the canvas-fade transition (280ms) so
      // the digit is fully visible exactly when the ink is gone.
      window.setTimeout(() => {
        setPhase({ kind: "settled", digit: fallback, score: r.score, source: "auto" });
      }, 300);
      writeAnswer(fallback, r.score, strokes);
    },
    [templateSet, writeAnswer],
  );

  const handleClear = useCallback((): void => {
    setPhase({ kind: "empty" });
    lastStrokesRef.current = [];
    writeAnswer(null, 0, []);
  }, [writeAnswer]);

  const clearCanvas = useCallback((): void => {
    const canvas = document.querySelector(`${cellSelector} [data-test="ink-canvas"]`);
    canvas?.dispatchEvent(new CustomEvent("ink-canvas:clear"));
  }, [cellSelector]);

  const openOverride = useCallback((): void => {
    setPhase((prev) => {
      if (prev.kind === "settled" || prev.kind === "morphing") {
        return { kind: "overriding", previousDigit: prev.kind === "settled" ? prev.digit : null };
      }
      return prev;
    });
  }, []);

  const pickOverride = useCallback(
    (label: DigitLabel): void => {
      const parsed = DigitLabelSchema.safeParse(label);
      if (!parsed.success) return;
      // Promote the recently-drawn stroke (if any) to a template for the
      // confirmed digit so the recognizer's accuracy compounds.
      if (lastStrokesRef.current.length > 0) {
        const tpl = makeTemplate(parsed.data, lastStrokesRef.current);
        appendTemplate(tpl);
      }
      setPhase({ kind: "settled", digit: parsed.data, score: 1, source: "manual" });
      writeAnswer(parsed.data, 1, lastStrokesRef.current);
    },
    [appendTemplate, writeAnswer],
  );

  const cancelOverride = useCallback((): void => {
    setPhase((prev) => {
      if (prev.kind !== "overriding") return prev;
      if (prev.previousDigit !== null) {
        return { kind: "settled", digit: prev.previousDigit, score: 1, source: "auto" };
      }
      return { kind: "empty" };
    });
  }, []);

  const digit = phase.kind === "morphing" || phase.kind === "settled" ? phase.digit : null;
  const showDigit = digit !== null && (phase.kind === "morphing" || phase.kind === "settled");
  const morphing = phase.kind === "morphing";
  const overriding = phase.kind === "overriding";
  // Hide the ink canvas whenever the cell is showing a digit OR the
  // override picker. Once recognition lands, the clean digit overlay
  // IS the answer; persisting strokes underneath would just confuse.
  const canvasFaded =
    phase.kind === "morphing" || phase.kind === "settled" || phase.kind === "overriding";

  return (
    <span
      className="inline-flex flex-col items-stretch align-baseline"
      data-cell-id={`${worksheetId}:${problemId}`}
      data-test="answer-cell"
      data-phase={phase.kind}
      data-digit={digit ?? ""}
    >
      <span
        className="relative inline-block rounded-card border border-current bg-paper overflow-hidden"
        style={{ width, height }}
      >
        <InkCanvas
          width={width}
          height={height}
          inputModes={inputModes}
          initialStrokes={initialStrokesRef.current as Stroke[]}
          endStrokeAfterMs={1500}
          inkColor="#1f1f3f"
          faded={canvasFaded}
          onStrokesComplete={handleStrokes}
          onClear={handleClear}
        />
        {showDigit ? (
          <span
            className="pointer-events-none absolute inset-0 flex items-center justify-center font-equation font-bold text-slate-ink tabular-nums"
            aria-hidden="true"
            data-test="recognized-digit"
            style={{
              fontSize: Math.round(height * 0.62),
              lineHeight: 1,
              // Cross-fade: enter from translated/scaled-down to settled.
              // The 280ms beat matches the canvas fade-out transition
              // so the digit is fully present when the ink is gone.
              opacity: morphing ? 0 : 1,
              transform: morphing ? "scale(0.7)" : "scale(1)",
              transition:
                "opacity 280ms cubic-bezier(0.32, 0.72, 0, 1), transform 280ms cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          >
            {digit}
          </span>
        ) : null}
        {overriding ? (
          <span
            className="absolute inset-0 z-10 grid grid-cols-5 gap-px bg-paper/95 p-0.5"
            data-test="digit-picker"
          >
            {DIGIT_CHOICES.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => pickOverride(label)}
                className="rounded-card border border-current font-equation text-xs font-bold hover:bg-current/10 active:scale-95 transition-transform"
                data-test="digit-picker-choice"
                data-digit={label}
              >
                {label}
              </button>
            ))}
          </span>
        ) : null}
      </span>
      <span className="flex items-center gap-1 mt-0.5 text-[10px] leading-tight">
        <button
          type="button"
          onClick={clearCanvas}
          className="inline-flex items-center gap-0.5 rounded-card border border-current px-1 py-0.5 opacity-60 hover:opacity-100"
          aria-label="Clear cell"
        >
          <Eraser size={10} aria-hidden="true" />
        </button>
        {phase.kind === "settled" ? (
          <button
            type="button"
            onClick={openOverride}
            className="inline-flex items-center gap-0.5 rounded-card border border-current px-1 py-0.5 opacity-60 hover:opacity-100"
            aria-label="Pick a different number"
            data-test="open-override"
          >
            <Pencil size={10} aria-hidden="true" />
          </button>
        ) : null}
        {overriding ? (
          <button
            type="button"
            onClick={cancelOverride}
            className="inline-flex items-center gap-0.5 rounded-card border border-current px-1 py-0.5 opacity-60 hover:opacity-100"
            aria-label="Cancel override"
          >
            <span>cancel</span>
          </button>
        ) : null}
      </span>
    </span>
  );
});
