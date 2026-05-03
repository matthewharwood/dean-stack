import type { AddingGameState, EquationSlot, HandSlot } from "@dean-stack/schemas";

// Source-of-truth for "where is a card in the layout". Drag handlers carry
// these around; pure swap logic transforms state by these locators alone.
export type SlotLocator = { kind: "hand"; id: string } | { kind: "equation"; id: string };

export function slotLocatorEquals(a: SlotLocator | null, b: SlotLocator | null): boolean {
  if (a === null || b === null) return a === b;
  return a.kind === b.kind && a.id === b.id;
}

export function readCardId(state: AddingGameState, locator: SlotLocator): string | null {
  if (locator.kind === "hand") {
    return state.player.hand.find((s) => s.id === locator.id)?.cardId ?? null;
  }
  return state.round?.equation.operandSlots.find((s) => s.id === locator.id)?.cardId ?? null;
}

function setHandCardId(hand: readonly HandSlot[], id: string, cardId: string | null): HandSlot[] {
  return hand.map((s) => (s.id === id ? { ...s, cardId } : s));
}

function setEquationCardId(
  slots: readonly EquationSlot[],
  id: string,
  cardId: string | null,
): EquationSlot[] {
  return slots.map((s) => (s.id === id ? { ...s, cardId } : s));
}

// Atomically swap whatever's in `source` and `target`. Empty slots count —
// "place a card on empty slot" is a swap with `null`.
//
// All four directions handled uniformly:
//   hand ↔ hand        — re-arrange hand (re-order operands without committing them)
//   hand ↔ equation    — place / replace; displaced card returns to the dragged-from slot
//   equation ↔ hand    — un-place from equation back to a chosen hand slot
//   equation ↔ equation — re-order operands within the equation
//
// Self-swap (same locator) is a no-op; missing round is a no-op.
export function applySwap(
  state: AddingGameState,
  source: SlotLocator,
  target: SlotLocator,
): AddingGameState {
  if (slotLocatorEquals(source, target)) return state;
  if (!state.round) return state;

  const sourceCardId = readCardId(state, source);
  const targetCardId = readCardId(state, target);

  let nextHand: readonly HandSlot[] = state.player.hand;
  let nextSlots: readonly EquationSlot[] = state.round.equation.operandSlots;

  if (source.kind === "hand") nextHand = setHandCardId(nextHand, source.id, targetCardId);
  else nextSlots = setEquationCardId(nextSlots, source.id, targetCardId);

  if (target.kind === "hand") nextHand = setHandCardId(nextHand, target.id, sourceCardId);
  else nextSlots = setEquationCardId(nextSlots, target.id, sourceCardId);

  // Any drag activity invalidates a prior evaluation — reset back to matching
  // and clear the outcome so the next Evaluate click re-computes against the
  // new arrangement. This lets the player iterate without a separate "Try
  // Again" affordance.
  return {
    ...state,
    player: { ...state.player, hand: [...nextHand] },
    round: {
      ...state.round,
      equation: { ...state.round.equation, operandSlots: [...nextSlots] },
      phase: "matching",
      outcome: null,
    },
  };
}
