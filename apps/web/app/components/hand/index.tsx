import type { CardCatalog, HandSlot } from "@dean-stack/schemas";
import type { ReactNode } from "react";

import { DraggableCard, EmptySlot, SlotWrapper } from "~/games/adding-game/drag";
import type { SlotLocator } from "~/games/adding-game/swap";

// Map a discriminated Card to the right DraggableCard payload props.
// Hoisted so the JSX spread reads as a single call instead of a nested
// ternary inside the surrounding `card ? (...) : null` expression.
type DraggablePayload = { value?: number; verdict?: boolean };

function cardPayload(
  card: { kind: "number"; value: number } | { kind: "verdict"; verdict: boolean },
): DraggablePayload {
  if (card.kind === "verdict") return { verdict: card.verdict };
  return { value: card.value };
}

export function Hand({
  hand,
  cards,
  dragLocked,
  display,
  onSwap,
}: {
  hand: readonly HandSlot[];
  cards: CardCatalog;
  dragLocked: boolean;
  // R5/R6 pass "ten-frame" so the kid's hand cards render as the 2×5
  // grid the math-ed worksheets use. R1–R4 stay on the numeric default.
  // Explicit `| undefined` matches strict exactOptionalPropertyTypes.
  display?: "numeric" | "ten-frame" | undefined;
  onSwap: (source: SlotLocator, target: SlotLocator) => void;
}): ReactNode {
  return (
    <>
      {hand.map((slot) => {
        const card = slot.cardId ? cards[slot.cardId] : undefined;
        return (
          <SlotWrapper key={slot.id} kind="hand" slotId={slot.id}>
            <EmptySlot />
            {card ? (
              <DraggableCard
                key={card.id}
                locator={{ kind: "hand", id: slot.id }}
                cardId={card.id}
                {...cardPayload(card)}
                display={display}
                dragLocked={dragLocked}
                onSwap={onSwap}
              />
            ) : null}
          </SlotWrapper>
        );
      })}
    </>
  );
}
