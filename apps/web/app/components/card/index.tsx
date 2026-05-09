import { defineComponent } from "~/lib/define-component";

import { CardPropsSchema } from "./schema";

// Total cells in the ten-frame grid. The standard math-ed visual is 2 rows
// × 5 columns; we cap rendering at 10 dots even if the value is higher.
// Today's levels max out at 9 (R6 boss static), so the cap is purely
// defensive.
const TEN_FRAME_TOTAL = 10;

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

// Render the dots of a ten-frame. Classic math-ed visual:
//   - 2×5 grid of square cells, all touching (no gap) so the grid lines
//     read as a single continuous frame.
//   - Each cell carries its own border; adjacent cell borders overlap to
//     form the inner grid lines, and the outer wrapper rounds the corners.
//   - Filled cells contain a centered dot. Empty cells are just the box.
//   - The whole grid is a fixed size and centered in the card area, so
//     it never stretches with the card and never collides with card padding.
//
// Cell size is 16px (`size-4`) — 5 cols × 16px = 80px wide, 2 rows × 16px
// = 32px tall. Fits comfortably inside both the 100×140 default card and
// the inset target frame without scaling.
function TenFrameDots({ filled, color }: { filled: number; color: "ink" | "muted" }) {
  const clamped = Math.max(0, Math.min(TEN_FRAME_TOTAL, filled));
  const dotClass = color === "ink" ? "bg-slate-ink" : "bg-medium-gray";
  return (
    <div className="flex size-full items-center justify-center">
      <div
        className="grid grid-cols-5 grid-rows-2 overflow-hidden rounded-[3px]"
        data-test="ten-frame"
        data-ten-frame-filled={clamped}
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
    </div>
  );
}

// Ten-frame card body: bold numeral on top, ten-frame grid underneath,
// both centered. The kid sees the digit AND the dot pattern together so
// the abstract symbol gets paired with the concrete count — the
// pedagogical bridge from "5" to "▣▣▣▣▣". Used by both default and
// target variants when display="ten-frame"; `color` controls the dot
// fill (dark slate for the kid's cards, muted gray for the locked static
// so it visually recedes the same way the numeric target did).
function TenFrameWithNumeral({ value, color }: { value: number; color: "ink" | "muted" }) {
  const numeralClass = color === "ink" ? "text-slate-ink" : "text-medium-gray";
  return (
    <div className="flex size-full flex-col items-center justify-center gap-1.5">
      <span className={`font-openrunde text-2xl font-bold leading-none ${numeralClass}`}>
        {value}
      </span>
      <TenFrameDots filled={value} color={color} />
    </div>
  );
}

export const Card = defineComponent(CardPropsSchema, (props) => {
  const variant = props.variant ?? "default";
  const display = props.display ?? "numeric";
  const disabled = props.disabled === true;
  if (variant === "target") {
    // Target / locked-static. Inset dotted frame says "this number is
    // given to you." Numeric path keeps the bold muted digit; ten-frame
    // pairs the digit with the 2×5 grid.
    return (
      <div
        className="flex size-full items-center justify-center rounded-[4px] border border-muted-gray bg-canvas-white p-1.5 shadow-inner"
        data-test="card"
        data-card-variant="target"
        data-card-display={display}
        data-card-value={props.value}
        data-card-disabled={disabled ? "true" : undefined}
      >
        <div className="flex size-full items-center justify-center rounded-[2px] border-2 border-dashed border-muted-gray/70">
          {display === "ten-frame" ? (
            <TenFrameWithNumeral value={props.value} color="muted" />
          ) : (
            <span className="font-openrunde text-3xl font-bold text-medium-gray">
              {props.value}
            </span>
          )}
        </div>
      </div>
    );
  }
  return (
    <div
      className="flex size-full items-center justify-center rounded-[4px] border border-light-gray bg-canvas-white shadow-sm"
      data-test="card"
      data-card-variant="default"
      data-card-display={display}
      data-card-value={props.value}
      data-card-disabled={disabled ? "true" : undefined}
    >
      {display === "ten-frame" ? (
        <TenFrameWithNumeral value={props.value} color="ink" />
      ) : (
        <span className="font-openrunde text-3xl font-bold text-slate-ink">{props.value}</span>
      )}
    </div>
  );
});
