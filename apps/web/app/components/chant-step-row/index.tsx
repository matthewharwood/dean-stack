import { defineComponent } from "~/lib/define-component";

import { ChantStepRowPropsSchema } from "./schema";

// R16 "Echo the Chant" stairs. Eleven ascending steps labeled 0..10,
// stacked vertically with step 10 at the top so the kid reads the
// chant as climbing the times-table tower. Each step is a tappable
// button; the parent supplies the lit-step prop (which one the
// chant is currently calling out) and the mastered-steps array
// (which ones the kid has already nailed on this pass).
//
// Pure visual leaf — no audio, no rhythm logic, no internal state.
// All beat / lit / mastery decisions are owned by the parent route's
// ChantClock + reducer pair. This keeps the per-component test surface
// small (just visual states) and makes the audio sync logic
// independently testable in Bun.
const STEPS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0] as const;

export const ChantStepRow = defineComponent(ChantStepRowPropsSchema, (props) => {
  const disabled = props.disabled === true;
  const mastered = new Set(props.masteredSteps);
  return (
    <ol
      className="flex flex-col gap-1 px-2"
      data-test="chant-step-row"
      data-lit-step={props.litStep ?? "none"}
    >
      {STEPS.map((step) => {
        const lit = props.litStep === step;
        const wasMastered = mastered.has(step);
        // `step` is the chant step VALUE (10..0), unique and stable across
        // the lifetime of the component — safe to use as the React key.
        // The variable used to be named `index` which (mis)matched the
        // no-array-index-as-key rule pattern; renaming makes the intent
        // legible without changing behavior.
        return (
          <li key={`step-${step}`} className="contents">
            <button
              type="button"
              disabled={disabled}
              onClick={() => props.onStepTap(step)}
              className={`flex h-9 w-full items-center justify-between rounded-md border-2 px-3 font-openrunde text-sm font-bold transition-colors ${chipClass(lit, wasMastered, disabled)}`}
              data-test="chant-step"
              data-step-index={step}
              data-step-lit={lit ? "true" : "false"}
              data-step-mastered={wasMastered ? "true" : "false"}
            >
              <span className="tabular-nums">{step}</span>
              <span aria-hidden className="text-base">
                {glyphFor(lit, wasMastered)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
});

// Glyph rendered inside each step. Hoisted to dodge sonarjs's nested-
// ternary rule on the JSX call site. Mastered wins over lit (a step
// the kid has nailed AND that's currently playing back gets the star,
// not the diamond).
function glyphFor(lit: boolean, mastered: boolean): string {
  if (mastered) return "★";
  if (lit) return "♦";
  return "·";
}

// Tailwind class for one step. Five distinct visual states:
//   disabled — both lit and not-lit go gray-on-gray
//   lit + mastered — bright + with star glyph (you've nailed this beat
//                   AND it's playing back to you on a re-listen)
//   lit only — bright active highlight
//   mastered only — softer filled-in marker
//   idle — hollow outline
function chipClass(lit: boolean, mastered: boolean, disabled: boolean): string {
  if (disabled) return "border-light-gray bg-light-gray/50 text-muted-gray cursor-not-allowed";
  if (lit && mastered) {
    return "border-amber-500 bg-amber-200 text-slate-ink shadow-[0_0_8px_rgba(245,158,11,0.55)]";
  }
  if (lit) {
    return "border-sky-500 bg-sky-200 text-slate-ink shadow-[0_0_8px_rgba(14,165,233,0.55)]";
  }
  if (mastered) return "border-emerald-400 bg-emerald-50 text-slate-ink";
  return "border-medium-gray/70 bg-canvas-white text-slate-ink hover:bg-whisper-purple";
}
