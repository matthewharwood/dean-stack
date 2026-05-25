import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import { VariantSchema } from "~/worksheet/schema";

import { type CellState, cellState, VARIANTS_IN_ORDER } from "./state";

export const PowerTallyPropsSchema = z.object({
  currentOrdinal: z.int().min(1).max(15),
  currentVariant: VariantSchema,
  totalStages: z.int().min(1).max(99).default(15),
});

// Calvin's #4 idea, now extended to the variant axis: a 15 × 3 grid that
// shows the kid's exact position in the 45-sheet arc. Each column is a
// stage, each row is a variant — A is a circle, B is a square, C is a
// triangle. Past sheets get a thin diagonal slash, today's sheet has a
// heavy ring + a ▾ over its column, future sheets stay hollow. Same shape
// vocabulary across all 15 worksheets so the kid can read their own
// progress at a glance, on paper, with no number reading required.
export const PowerTally = defineComponent(
  PowerTallyPropsSchema,
  ({ currentOrdinal, currentVariant, totalStages }): ReactNode => (
    <div className="flex flex-col gap-1" data-test="power-tally">
      <p className="font-display text-[9px] uppercase tracking-[0.22em] opacity-60">
        Mission Progress: Stage × Variant
      </p>
      <div className="flex items-start gap-2">
        {/* Tiny A/B/C row labels on the left edge, so the shape vocabulary
            is decodable even without the legend below. */}
        <div className="flex flex-col gap-0.5 pt-3 font-display text-[7px] uppercase tracking-widest opacity-50 leading-[14px]">
          {VARIANTS_IN_ORDER.map((v) => (
            <span key={v}>{v}</span>
          ))}
        </div>
        <ol
          className="grid gap-x-1.5 gap-y-0.5"
          style={{ gridTemplateColumns: `repeat(${totalStages}, 1.05rem)` }}
          aria-label={`Worksheet ${(currentOrdinal - 1) * VARIANTS_IN_ORDER.length + VARIANTS_IN_ORDER.indexOf(currentVariant) + 1} of ${totalStages * VARIANTS_IN_ORDER.length}`}
        >
          {/* ▾ TODAY caption row — one cell per stage column. Only the
              current stage's cell renders the marker. */}
          {Array.from({ length: totalStages }, (_, i) => {
            const ordinal = i + 1;
            const isTodayColumn = ordinal === currentOrdinal;
            return (
              <li
                key={`hdr-${ordinal}`}
                className="flex justify-center font-display text-[8px] uppercase opacity-70 leading-none"
                aria-hidden="true"
              >
                {isTodayColumn ? "▾" : ""}
              </li>
            );
          })}
          {/* 3 rows × 15 columns of shapes. */}
          {VARIANTS_IN_ORDER.flatMap((variant) =>
            Array.from({ length: totalStages }, (_, i) => {
              const ordinal = i + 1;
              const state = cellState(ordinal, variant, currentOrdinal, currentVariant);
              return (
                <li
                  key={`${variant}-${ordinal}`}
                  className="flex justify-center"
                  aria-hidden="true"
                >
                  <VariantShape variant={variant} state={state} />
                </li>
              );
            }),
          )}
          {/* Stage-number footer row — keeps the ordinal cue without
              putting numerals in the equation reading area. */}
          {Array.from({ length: totalStages }, (_, i) => {
            const ordinal = i + 1;
            return (
              <li
                key={`num-${ordinal}`}
                className="flex justify-center font-display text-[7px] opacity-50 leading-none"
                aria-hidden="true"
              >
                {ordinal}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  ),
);

const SHAPE_SIZE = 14;

type ShapeProps = { variant: "A" | "B" | "C"; state: CellState };

// All three shapes share the same 14×14 viewBox so they line up in the
// grid. Stroke weight bumps on the current cell; past cells overlay a
// thin diagonal slash that crosses the shape edge — saves ink versus a
// fill, and leaves room for the parent or kid to ink it in fully later.
function VariantShape({ variant, state }: ShapeProps): ReactNode {
  const strokeWidth = state === "current" ? 2 : 1;
  return (
    <svg
      width={SHAPE_SIZE}
      height={SHAPE_SIZE}
      viewBox={`0 0 ${SHAPE_SIZE} ${SHAPE_SIZE}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <ShapeGlyph variant={variant} />
      {state === "past" ? <path d="M2.5 11.5 L11.5 2.5" strokeWidth="1.25" /> : null}
    </svg>
  );
}

// SVG primitive for the variant glyph. Component (not a helper that
// returns JSX) so React reconciliation can key on it and react-doctor
// stops flagging "inline render function".
function ShapeGlyph({ variant }: { variant: "A" | "B" | "C" }): ReactNode {
  switch (variant) {
    case "A":
      return <circle cx="7" cy="7" r="5.5" />;
    case "B":
      return <rect x="1.75" y="1.75" width="10.5" height="10.5" rx="1" />;
    case "C":
      return <path d="M7 1.5 L12.25 11.5 L1.75 11.5 Z" />;
    default:
      return assertNever(variant);
  }
}

function assertNever(x: never): never {
  throw new Error(`unreachable variant: ${String(x)}`);
}
