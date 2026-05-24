import type { ReactNode } from "react";

// The 5 candidate answer cards for R15 find-product, rendered in a
// horizontal row beneath the equation. Each card is tappable — on tap
// it fires `onChoose(cardId)`. `dragLocked` mirrors the rest of the
// equation row's "between-rounds" gating so the kid can't fire taps
// mid-celebration.
export function FindProductChoices({
  choices,
  onChoose,
  dragLocked,
}: {
  choices: readonly { id: string; kind: string; value?: number }[];
  onChoose: (cardId: string) => void;
  dragLocked: boolean;
}): ReactNode {
  return (
    <div className="flex items-center justify-center gap-3" data-test="find-product-choices">
      {choices.map((choice) => {
        const value = typeof choice.value === "number" ? choice.value : 0;
        return (
          <button
            key={choice.id}
            type="button"
            disabled={dragLocked}
            onClick={() => onChoose(choice.id)}
            className="flex h-[100px] w-[80px] shrink-0 items-center justify-center rounded-[4px] border-2 border-slate-ink bg-canvas-white font-openrunde text-3xl font-bold text-slate-ink shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            data-test="find-product-choice"
            data-card-id={choice.id}
            data-card-value={value}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
