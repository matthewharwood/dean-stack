import type { CardCatalog } from "@dean-stack/schemas";
import type { ReactNode } from "react";

import { DraggableCard, EmptySlot, SlotWrapper } from "~/games/adding-game/drag";
import type { SlotLocator } from "~/games/adding-game/swap";

// Droppable verdict slot for true-false-multiply (R9). Sits to the
// right of the equation's product card. Renders an empty dotted-ring
// placeholder when nothing's dropped; when a True/False card is
// committed, it renders the DraggableCard so the kid can swap it back
// out before clicking Evaluate.
export function VerdictSlot({
  slot,
  cards,
  dragLocked,
  onSwap,
}: {
  slot: { id: string; cardId: string | null };
  cards: CardCatalog;
  dragLocked: boolean;
  onSwap: (source: SlotLocator, target: SlotLocator) => void;
}): ReactNode {
  const card = slot.cardId ? cards[slot.cardId] : undefined;
  const verdict = card && card.kind === "verdict" ? card.verdict : undefined;
  return (
    <div className="h-[140px] w-[100px] shrink-0" data-test="verdict-slot">
      <SlotWrapper kind="equation" slotId={slot.id}>
        <EmptySlot />
        {card && verdict !== undefined ? (
          <DraggableCard
            key={card.id}
            locator={{ kind: "equation", id: slot.id }}
            cardId={card.id}
            verdict={verdict}
            dragLocked={dragLocked}
            onSwap={onSwap}
          />
        ) : null}
      </SlotWrapper>
    </div>
  );
}
