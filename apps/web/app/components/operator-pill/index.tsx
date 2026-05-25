import { type ReactNode, useEffect, useReducer } from "react";

import { OperatorShape, pickOperatorShape } from "~/components/operator-shape";

// Operator pill — circular, OpenRunde, white card with border + subtle
// shadow. Sized so it never overlaps the operand slots: the equation
// row's `gap-[28px]` leaves enough breathing room around a 56px pill.
//
// The pulse animation fires when the glyph CHANGES between deals: the
// component runs `op-out` (fade + scale-down + lift) for 200ms, swaps
// the displayed glyph, then runs `op-in` (drop + scale-up + fade-in)
// for 280ms. Total ~480ms — the kid's eye catches the operator shift
// before they start picking cards. CSS keyframes are owned by
// `data-phase` so the animation is driven purely by attribute changes.
//
// State is a single reducer (not two useStates + cascading setters):
// the swap/fade-in/settle transitions are sequenced animation steps,
// each one a discrete dispatch. useReducer makes the state machine
// explicit and side-steps react-doctor's no-derived-useState +
// no-cascading-set-state rules by construction.
type PillState = { phase: "idle" | "out" | "in"; shown: string };
type PillAction = { type: "start-out" } | { type: "swap"; glyph: string } | { type: "settle" };

function pillReducer(state: PillState, action: PillAction): PillState {
  switch (action.type) {
    case "start-out":
      return { phase: "out", shown: state.shown };
    case "swap":
      return { phase: "in", shown: action.glyph };
    case "settle":
      return { phase: "idle", shown: state.shown };
    default:
      return state;
  }
}

export function OperatorPill({ glyph }: { glyph: string }): ReactNode {
  const [{ phase, shown }, dispatch] = useReducer(pillReducer, { phase: "idle", shown: glyph });

  useEffect(() => {
    if (glyph === shown) return;
    dispatch({ type: "start-out" });
    const t1 = window.setTimeout(() => dispatch({ type: "swap", glyph }), 200);
    const t2 = window.setTimeout(() => dispatch({ type: "settle" }), 200 + 280);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [glyph, shown]);

  const shape = pickOperatorShape(shown);
  // Triangle's visual centroid sits BELOW its geometric center (the
  // centroid of an upward-pointing triangle is at y = 2/3 of its
  // height). A glyph centered on the pill's geometric center reads
  // as "floating high" inside the triangle silhouette. Nudging the
  // glyph down a few px lands it on the centroid so the − sits in
  // the visual middle of the triangle, not above it. Circle and
  // diamond are radially symmetric — no offset needed.
  const glyphOffsetClass = shape === "triangle" ? "translate-y-[6px]" : "";
  return (
    <span
      className="relative flex size-14 shrink-0 select-none items-center justify-center data-[phase=in]:animate-op-in data-[phase=out]:animate-op-out"
      data-phase={phase}
      data-test="operator-pill"
    >
      <OperatorShape kind={shape} />
      <span
        className={`relative font-openrunde text-3xl font-bold text-slate-ink ${glyphOffsetClass}`}
      >
        {shown}
      </span>
    </span>
  );
}
