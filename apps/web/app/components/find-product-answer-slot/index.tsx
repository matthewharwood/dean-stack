import type { ReactNode } from "react";

import { Card } from "~/components/card";

// Right-hand answer slot for R15 find-product. Renders the kid's
// committed pick OR a "?" placeholder when the slot is empty (no pick
// yet). The card itself is non-interactive — taps land on the
// FindProductChoices row beneath. Sized identically to the locked
// factor slots so the row alignment stays clean.
export function FindProductAnswerSlot({ value }: { value: number | null }): ReactNode {
  return (
    <div className="h-[140px] w-[100px] shrink-0" data-test="equation-slot">
      {value == null ? (
        <div
          className="flex h-full w-full items-center justify-center rounded-[4px] border-2 border-dashed border-medium-gray/70 bg-canvas-white"
          data-test="find-product-answer-empty"
        >
          <span className="font-openrunde text-5xl font-bold text-muted-gray" data-card-value="?">
            ?
          </span>
        </div>
      ) : (
        <Card value={value} variant="target" display="numeric" disabled />
      )}
    </div>
  );
}
