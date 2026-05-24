import { Scissors } from "lucide-react";
import type { ReactNode } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";

export const TimeCouponPropsSchema = z.object({
  problemCount: z.int().min(4).max(30),
  sheetLabel: z.string().min(1),
});

const GROUP_SIZE = 4;
const BONUS_MINUTES = 2;

// Boarding-pass coupon (Calvin's design): correctness → iPad minutes via a
// physical tear-off the parent grades and the kid scissors free.
//
// Mechanic:
//   floor(correct / 4) base minutes
//   + 2 bonus minutes if correct === problemCount
//
// Visualized as N hollow circles grouped in fours; each completed group =
// a bracket labelled `1m`, `2m`, `3m`. Trailing circles (for 10- and 15-Q
// sheets) sit after the last bracket as bonus-only; they don't earn a minute
// on their own but DO count toward the perfect-sheet bonus.
//
// Stub on the right gets the final integer the parent writes, plus initial +
// "used" checkbox at redemption — anti-photocopy belt + suspenders.
export const TimeCoupon = defineComponent(
  TimeCouponPropsSchema,
  ({ problemCount, sheetLabel }): ReactNode => {
    const fullGroups = Math.floor(problemCount / GROUP_SIZE);
    const remainder = problemCount % GROUP_SIZE;
    const maxBaseMinutes = fullGroups;
    const maxTotalMinutes = maxBaseMinutes + BONUS_MINUTES;

    // Build the circle groups + the trailing remainder cluster as one flat
    // list the JSX can iterate over without nesting array maps. Each group
    // gets a stable id so React keying is content-derived, not index-derived.
    type CircleGroup = { id: string; size: number; bracket: string | null };
    const groups: CircleGroup[] = [];
    for (let i = 1; i <= fullGroups; i++) {
      groups.push({ id: `g${i}`, size: GROUP_SIZE, bracket: `${i}m` });
    }
    if (remainder > 0) {
      groups.push({ id: "g-extra", size: remainder, bracket: null });
    }

    return (
      <div className="w-full" data-test="time-coupon">
        {/* Page-detach perforation — kid scissors the coupon off the sheet
            along this line. Scissor glyph is the affordance. */}
        <ScissorLine />
        {/* The coupon proper: a flex row with vertical perforation between
            the grading panel and the redemption stub. */}
        <div className="flex items-stretch border border-current rounded-sm overflow-hidden">
          {/* Main panel — 70% of width — where parent grades. */}
          <div className="flex-1 px-3 py-2.5">
            <div className="flex items-baseline justify-between mb-1.5">
              <p className="font-display text-[9px] uppercase tracking-[0.22em] opacity-70">
                Field Station · iPad Clearance
              </p>
              <p className="font-display text-[9px] uppercase tracking-[0.18em] opacity-60">
                {sheetLabel}
              </p>
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <p className="font-display text-[10px] uppercase tracking-[0.15em] opacity-70 whitespace-nowrap mt-1">
                Correct →
              </p>
              {groups.map((group) => (
                <CircleGroup key={group.id} group={group} />
              ))}
              <BonusBox problemCount={problemCount} />
            </div>
            <div className="flex items-end gap-4 mt-3 font-display text-[10px] uppercase tracking-[0.15em]">
              <div className="flex items-baseline gap-2 opacity-80">
                <span>Total Minutes</span>
                <span
                  className="inline-block border-b-2 border-current text-center font-equation text-base"
                  style={{ minWidth: "3em", height: "1.5em" }}
                />
                <span className="opacity-60">/ {maxTotalMinutes} max</span>
              </div>
              <div className="flex items-baseline gap-2 opacity-80">
                <span>Graded By</span>
                <span
                  className="inline-block border-b-2 border-current"
                  style={{ minWidth: "5em", height: "1.5em" }}
                />
              </div>
            </div>
          </div>
          {/* Vertical perforation — second scissor cut at redemption time so
              the stub comes off the main panel. */}
          <VerticalPerforation />
          {/* Stub — 30% width — what the kid carries to redemption. */}
          <div
            className="px-3 py-2.5 flex flex-col items-center justify-between gap-1 shrink-0"
            style={{ width: "9rem" }}
          >
            <p className="font-display text-[9px] uppercase tracking-[0.22em] opacity-70 text-center">
              Boarding Time
            </p>
            <div className="flex items-baseline gap-1">
              <span
                className="inline-block border-b-2 border-current text-center font-equation text-3xl font-bold leading-none"
                style={{ minWidth: "2.6em", height: "1.1em" }}
              />
              <span className="font-display text-xs uppercase tracking-wider opacity-70">min</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 w-full">
              <p className="font-display text-[8px] uppercase tracking-[0.2em] opacity-60">
                {sheetLabel}
              </p>
              <div className="flex items-center gap-2 text-[9px] font-display uppercase tracking-wider opacity-70">
                <span
                  className="inline-block border border-current"
                  style={{ width: "0.75rem", height: "0.75rem" }}
                  aria-hidden="true"
                />
                <span>used at redemption</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

function CircleGroup({ group }: { group: { size: number; bracket: string | null } }): ReactNode {
  // Stable per-circle ids so React keys are content-derived (no array index).
  const circles = Array.from({ length: group.size }, (_, i) => `c-${i}`);
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex gap-1" aria-hidden="true">
        {circles.map((id) => (
          <svg
            key={id}
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
            focusable={false}
          >
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.25" />
          </svg>
        ))}
      </div>
      {group.bracket ? (
        <div className="flex flex-col items-center" style={{ width: "100%" }}>
          {/* Square bracket below the circles — visual "these four together = N min" */}
          <svg
            width="100%"
            height="6"
            viewBox={`0 0 ${group.size * 22} 6`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d={`M2 0 L2 5 L${group.size * 22 - 2} 5 L${group.size * 22 - 2} 0`}
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
          </svg>
          <p className="font-display text-[10px] uppercase tracking-wider opacity-80 mt-0.5">
            {group.bracket}
          </p>
        </div>
      ) : (
        <p className="font-display text-[9px] uppercase tracking-wider opacity-50 mt-0.5">extra</p>
      )}
    </div>
  );
}

function BonusBox({ problemCount }: { problemCount: number }): ReactNode {
  return (
    <div className="flex flex-col items-center gap-0.5 border-l border-dashed border-current pl-3 ml-1">
      <p className="font-display text-[9px] uppercase tracking-wider opacity-70">
        All {problemCount}?
      </p>
      <div className="flex items-center gap-1">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M3.5 7 L6 9.5 L10.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="font-display text-[10px] uppercase font-semibold">+{BONUS_MINUTES}m</span>
      </div>
      <p className="font-display text-[9px] uppercase tracking-wider opacity-50">bonus</p>
    </div>
  );
}

function ScissorLine(): ReactNode {
  return (
    <div className="flex items-center gap-2 my-2" aria-hidden="true">
      <Scissors size={14} strokeWidth={1.5} className="shrink-0" />
      <span
        className="flex-1 border-t border-dashed border-current"
        style={{ borderTopWidth: "1.5px" }}
      />
    </div>
  );
}

function VerticalPerforation(): ReactNode {
  return (
    <div
      className="flex flex-col items-center justify-center border-l border-dashed border-current"
      style={{ borderLeftWidth: "1.5px" }}
      aria-hidden="true"
    >
      <Scissors size={11} strokeWidth={1.5} className="rotate-90 -my-1 bg-paper" />
    </div>
  );
}
