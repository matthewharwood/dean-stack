import type { ReactNode } from "react";

import { defineComponent } from "~/lib/define-component";

import { CardPropsSchema } from "./schema";

// Total cells in one ten-frame (2 rows × 5 cols). Values 11–20 stack a
// SECOND ten-frame beneath the first (top fills to 10, bottom fills with
// value − 10) — the standard "double-ten-frame" / twenty-frame layout the
// kid sees on math-ed worksheets. R7/R8 raised the hand-value cap to 20;
// the stack visualizes "you crossed 10" as a distinct second frame
// instead of silently clamping at 10 dots.
const TEN_FRAME_TOTAL = 10;
const TWENTY_FRAME_TOTAL = 20;

// Stable cell ids for the React key. The grid topology is fixed (2 rows ×
// 5 cols) and cells never reorder, so deriving a constant tuple keyed by
// row/col satisfies no-array-index-as-key without runtime allocation.
const TEN_FRAME_CELL_IDS = [
  "r0c0",
  "r0c1",
  "r0c2",
  "r0c3",
  "r0c4",
  "r1c0",
  "r1c1",
  "r1c2",
  "r1c3",
  "r1c4",
] as const;

// Render ONE 2×5 ten-frame. Classic math-ed visual:
//   - 2×5 grid of square cells, all touching (no gap) so the grid lines
//     read as a single continuous frame.
//   - Each cell carries its own border; adjacent cell borders overlap to
//     form the inner grid lines, and the outer wrapper rounds the corners.
//   - Filled cells contain a centered dot. Empty cells are just the box.
//
// Cell size is 16px (`size-4`) — 5 cols × 16px = 80px wide, 2 rows × 16px
// = 32px tall. Fits comfortably inside both the 100×140 default card and
// the inset target frame without scaling.
//
// `filled` is clamped to [0, 10] — values >10 are the caller's problem
// (use `TenFrameStack` instead). `index` distinguishes the top (0) and
// bottom (1) frame in stacked-frame layouts so tests can target either
// independently.
function TenFrameDots({
  filled,
  color,
  index = 0,
}: {
  filled: number;
  color: "ink" | "muted";
  index?: number;
}) {
  const clamped = Math.max(0, Math.min(TEN_FRAME_TOTAL, filled));
  const dotClass = color === "ink" ? "bg-slate-ink" : "bg-medium-gray";
  return (
    <div
      className="grid grid-cols-5 grid-rows-2 overflow-hidden rounded-[3px]"
      data-test="ten-frame"
      data-ten-frame-filled={clamped}
      data-ten-frame-index={index}
    >
      {TEN_FRAME_CELL_IDS.map((cellId, i) => {
        const isFilled = i < clamped;
        return (
          <span
            key={cellId}
            className="flex size-4 items-center justify-center border border-medium-gray/70 bg-canvas-white"
            data-ten-frame-cell={isFilled ? "filled" : "empty"}
          >
            {isFilled ? <span className={`size-2 rounded-full ${dotClass}`} /> : null}
          </span>
        );
      })}
    </div>
  );
}

// Stack of one or two ten-frames. ≤10 renders a single frame (matches
// R5/R6's original look). >10 renders the standard double-ten-frame: top
// frame fully filled (10), bottom frame holds the remainder. The two
// frames are separated by a small gap so they read as TWO frames, not a
// single 4×5 grid — the "you crossed 10" signal is the whole point of
// the stack.
function TenFrameStack({ value, color }: { value: number; color: "ink" | "muted" }) {
  const clamped = Math.max(0, Math.min(TWENTY_FRAME_TOTAL, value));
  const needsSecondFrame = clamped > TEN_FRAME_TOTAL;
  const topFilled = needsSecondFrame ? TEN_FRAME_TOTAL : clamped;
  const bottomFilled = needsSecondFrame ? clamped - TEN_FRAME_TOTAL : 0;
  return (
    <div
      className="flex size-full flex-col items-center justify-center gap-0.5"
      data-test="ten-frame-stack"
      data-ten-frame-stack-value={clamped}
    >
      <TenFrameDots filled={topFilled} color={color} index={0} />
      {needsSecondFrame ? <TenFrameDots filled={bottomFilled} color={color} index={1} /> : null}
    </div>
  );
}

// Ten-frame card body: bold numeral on top, ten-frame stack underneath,
// both centered. The kid sees the digit AND the dot pattern together so
// the abstract symbol gets paired with the concrete count — the
// pedagogical bridge from "5" to "▣▣▣▣▣". Values >10 stack a second
// frame; see `TenFrameStack`. Used by both default and target variants
// when display="ten-frame"; `color` controls the dot fill (dark slate
// for the kid's cards, muted gray for the locked static so it visually
// recedes the same way the numeric target did).
function TenFrameWithNumeral({ value, color }: { value: number; color: "ink" | "muted" }) {
  const numeralClass = color === "ink" ? "text-slate-ink" : "text-medium-gray";
  return (
    <div className="flex size-full flex-col items-center justify-center gap-1.5">
      <span className={`font-openrunde text-2xl font-bold leading-none ${numeralClass}`}>
        {value}
      </span>
      <TenFrameStack value={value} color={color} />
    </div>
  );
}

// Verdict card body — bold TRUE / FALSE text with a colored tint.
// Green for true, red for false. Sized so it reads at a glance from
// across the table for a 7-year-old. R9 only.
function VerdictBody({ verdict }: { verdict: boolean }) {
  const tone = verdict
    ? "text-success-green border-success-green/40 bg-success-green/10"
    : "text-vivid-orange border-vivid-orange/40 bg-vivid-orange/10";
  const label = verdict ? "TRUE" : "FALSE";
  return (
    <div
      className={`flex size-full items-center justify-center rounded-[3px] border-2 font-openrunde text-2xl font-bold tracking-wide ${tone}`}
      data-test="verdict-body"
      data-verdict={verdict ? "true" : "false"}
    >
      {label}
    </div>
  );
}

// Hoisted body picker — flat if/return chain so sonarjs's nested-conditional
// rule doesn't fire on the card body branch. `color` chooses the dot tint
// for the ten-frame path AND the numeral tone for the digit path.
function cardBody({
  isVerdict,
  verdict,
  display,
  value,
  color,
}: {
  isVerdict: boolean;
  verdict: boolean;
  display: "numeric" | "ten-frame" | "verdict";
  value: number;
  color: "ink" | "muted";
}): ReactNode {
  if (isVerdict) return <VerdictBody verdict={verdict} />;
  if (display === "ten-frame") return <TenFrameWithNumeral value={value} color={color} />;
  const numeralTone = color === "ink" ? "text-slate-ink" : "text-medium-gray";
  return <span className={`font-openrunde text-3xl font-bold ${numeralTone}`}>{value}</span>;
}

// Hoisted attribute helpers — flat returns keep the JSX spread free of
// nested ternaries.
function verdictAttr(isVerdict: boolean, verdict: boolean): string | undefined {
  if (!isVerdict) return undefined;
  return verdict ? "true" : "false";
}

function displayAttr(isVerdict: boolean, display: "numeric" | "ten-frame"): string {
  return isVerdict ? "verdict" : display;
}

export const Card = defineComponent(CardPropsSchema, (props) => {
  const variant = props.variant ?? "default";
  const display = props.display ?? "numeric";
  const disabled = props.disabled === true;
  const isVerdict = props.verdict !== undefined;
  const verdict = props.verdict === true;
  // value is optional in the schema (verdict cards don't carry one), but
  // every numeric render path needs a concrete int — fall back to 0
  // defensively rather than scattering `?? 0` at each call site.
  const value = props.value ?? 0;
  const dataValue = isVerdict ? undefined : value;
  const dataDisabled = disabled ? "true" : undefined;
  if (variant === "target") {
    // Target / locked-static. Inset dotted frame says "this number is
    // given to you." Numeric path keeps the bold muted digit; ten-frame
    // pairs the digit with the 2×5 grid. Verdict-as-target isn't used
    // today, but the branch falls through to the verdict body for
    // consistency.
    return (
      <div
        className="flex size-full items-center justify-center rounded-[4px] border border-muted-gray bg-canvas-white p-1.5 shadow-inner"
        data-test="card"
        data-card-variant="target"
        data-card-display={displayAttr(isVerdict, display)}
        data-card-value={dataValue}
        data-card-verdict={verdictAttr(isVerdict, verdict)}
        data-card-disabled={dataDisabled}
      >
        <div className="flex size-full items-center justify-center rounded-[2px] border-2 border-dashed border-muted-gray/70">
          {cardBody({ isVerdict, verdict, display, value, color: "muted" })}
        </div>
      </div>
    );
  }
  return (
    <div
      className="flex size-full items-center justify-center rounded-[4px] border border-light-gray bg-canvas-white shadow-sm"
      data-test="card"
      data-card-variant="default"
      data-card-display={displayAttr(isVerdict, display)}
      data-card-value={dataValue}
      data-card-verdict={verdictAttr(isVerdict, verdict)}
      data-card-disabled={dataDisabled}
    >
      {cardBody({ isVerdict, verdict, display, value, color: "ink" })}
    </div>
  );
});
