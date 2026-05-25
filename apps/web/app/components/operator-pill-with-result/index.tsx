import type { ReactNode } from "react";

import { OperatorPill } from "~/components/operator-pill";

// Operator pill paired with the on-error result chip. On a loss we surface
// the kid's actual computed LHS (e.g. 2 − 1 = 1) directly under the
// operator pill so the answer sits between the two cards he dragged in —
// the same spot his eye is already on after dropping the second card.
// The chip uses the existing `vivid-orange` failure palette + the hint
// slide-in keyframe so it reads as part of the same "wrong" beat as the
// HintTooltip below the action button.
export function OperatorPillWithResult({
  glyph,
  failedComputed,
}: {
  glyph: string;
  failedComputed: number | null;
}): ReactNode {
  return (
    <div className="relative shrink-0">
      <OperatorPill glyph={glyph} />
      {failedComputed !== null ? (
        <div
          className="absolute top-full left-1/2 mt-2 flex -translate-x-1/2 items-center gap-1 rounded-md border-2 border-vivid-orange/40 bg-vivid-orange/10 px-2 py-0.5 font-openrunde text-lg font-bold whitespace-nowrap text-vivid-orange shadow-subtle animate-hint-slide-in"
          data-test="operator-result-badge"
          aria-live="polite"
        >
          <span aria-hidden>=</span>
          <span>{failedComputed}</span>
        </div>
      ) : null}
    </div>
  );
}
