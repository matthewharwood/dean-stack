import type { CardCatalog } from "@dean-stack/schemas";
import type { ReactNode } from "react";

import { Card } from "~/components/card";
import { DraggableCard, EmptySlot, SlotWrapper } from "~/games/adding-game/drag";
import type { SlotLocator } from "~/games/adding-game/swap";

// One slot in the find-missing-result layout. Locked → display-only Card
// (the static); unlocked → standard SlotWrapper + DraggableCard pattern.
export function DropOrLockedSlot({
  slot,
  cards,
  dragLocked,
  display,
  onSwap,
}: {
  slot: { id: string; cardId: string | null; locked: boolean };
  cards: CardCatalog;
  dragLocked: boolean;
  // R5/R6 pass "ten-frame"; R1–R4 don't render this component (find-sum
  // shape uses the inline 2-slot layout above). Explicit `| undefined`
  // matches strict exactOptionalPropertyTypes.
  display?: "numeric" | "ten-frame" | undefined;
  onSwap: (source: SlotLocator, target: SlotLocator) => void;
}): ReactNode {
  const card = slot.cardId ? cards[slot.cardId] : undefined;
  // DropOrLockedSlot is reused across find-missing-result (R5–R8) which
  // only deals number cards, so the narrowing is purely defensive.
  const cardValue = card && card.kind === "number" ? card.value : 0;
  if (slot.locked) {
    return (
      <div
        className="h-[140px] w-[100px] shrink-0"
        data-test="equation-slot"
        data-slot-locked="true"
      >
        <Card value={cardValue} variant="target" display={display} disabled />
      </div>
    );
  }
  return (
    <div className="h-[140px] w-[100px] shrink-0" data-test="equation-slot">
      <SlotWrapper kind="equation" slotId={slot.id}>
        <EmptySlot />
        {card ? (
          <DraggableCard
            key={card.id}
            locator={{ kind: "equation", id: slot.id }}
            cardId={card.id}
            value={cardValue}
            display={display}
            dragLocked={dragLocked}
            onSwap={onSwap}
          />
        ) : null}
      </SlotWrapper>
    </div>
  );
}
