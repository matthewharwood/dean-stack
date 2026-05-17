import { Minus, Plus } from "lucide-react";

import { defineComponent } from "~/lib/define-component";

import { StepperCardPropsSchema } from "./schema";

// R9–R11 stepper card. Card-sized (matches the regular 100×140 slot so
// it drops into the equation row without re-layout), but the entire
// surface is interactive:
//   - top half  → tap fires onIncrement (+1)
//   - bottom half → tap fires onDecrement (−1)
//   - center → a circle containing the current value
//
// No drag. The kid never picks this card up — they tap on the card
// itself to nudge the value toward the answer. Big tap targets and a
// single bold numeral in the middle keep the affordance obvious for a
// 7-year-old.
//
// The two halves are full-width buttons stacked vertically. The number
// circle is absolutely positioned over the center so taps near the
// number still land on whichever half they're closer to (no dead zone).
// We pass `pointer-events-none` on the circle so the click reaches the
// button underneath.
export const StepperCard = defineComponent(StepperCardPropsSchema, (props) => {
  const disabled = props.disabled === true;
  return (
    <div
      className="relative size-full select-none rounded-[4px] border-2 border-slate-ink bg-canvas-white shadow-sm"
      data-test="stepper-card"
      data-stepper-value={props.value}
      data-stepper-disabled={disabled ? "true" : undefined}
    >
      <div className="flex h-full w-full flex-col">
        <button
          type="button"
          onClick={props.onIncrement}
          disabled={disabled}
          aria-label={`Increase to ${props.value + 1}`}
          className="flex flex-1 items-start justify-center rounded-t-[3px] border-b border-medium-gray/40 bg-canvas-white pt-2 text-radiant-violet transition-colors duration-100 hover:bg-whisper-purple active:bg-whisper-purple/80 disabled:cursor-not-allowed disabled:bg-canvas-white/60 disabled:text-muted-gray/40"
          data-test="stepper-increment"
        >
          <Plus size={28} strokeWidth={3} className="drop-shadow-sm" aria-hidden />
        </button>
        <button
          type="button"
          onClick={props.onDecrement}
          disabled={disabled}
          aria-label={`Decrease to ${Math.max(0, props.value - 1)}`}
          className="flex flex-1 items-end justify-center rounded-b-[3px] bg-canvas-white pb-2 text-radiant-violet transition-colors duration-100 hover:bg-whisper-purple active:bg-whisper-purple/80 disabled:cursor-not-allowed disabled:bg-canvas-white/60 disabled:text-muted-gray/40"
          data-test="stepper-decrement"
        >
          <Minus size={28} strokeWidth={3} className="drop-shadow-sm" aria-hidden />
        </button>
      </div>
      {/* Number circle, absolutely centered over the two halves. The
          circle is pointer-events-none so the tap passes through to
          whichever half is underneath — there's no dead zone in the
          middle of the card. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="flex size-12 items-center justify-center rounded-full border-2 border-slate-ink bg-canvas-white font-openrunde text-2xl font-bold text-slate-ink shadow-subtle"
          data-test="stepper-numeral"
        >
          {props.value}
        </div>
      </div>
    </div>
  );
});
