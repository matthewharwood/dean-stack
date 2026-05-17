import type { AddingGameState, Equation, EquationSlot, HandSlot } from "@dean-stack/schemas";

// Source-of-truth for "where is a card in the layout". Drag handlers carry
// these around; pure swap logic transforms state by these locators alone.
// `kind: "equation"` covers BOTH the operand slots and the R9 verdict slot
// — they're both droppable equation-area slots; we look them up by id.
export type SlotLocator = { kind: "hand"; id: string } | { kind: "equation"; id: string };

export function slotLocatorEquals(a: SlotLocator | null, b: SlotLocator | null): boolean {
  if (a === null || b === null) return a === b;
  return a.kind === b.kind && a.id === b.id;
}

// Look up an equation slot by id across BOTH `operandSlots` and the R9-only
// `verdictSlot`. Returns null when the slot isn't found — callers treat that
// as "no card here" rather than crashing.
function findEquationSlot(equation: Equation, id: string): EquationSlot | null {
  const op = equation.operandSlots.find((s) => s.id === id);
  if (op) return op;
  if (equation.verdictSlot?.id === id) return equation.verdictSlot;
  return null;
}

export function readCardId(state: AddingGameState, locator: SlotLocator): string | null {
  if (locator.kind === "hand") {
    return state.player.hand.find((s) => s.id === locator.id)?.cardId ?? null;
  }
  if (!state.round) return null;
  return findEquationSlot(state.round.equation, locator.id)?.cardId ?? null;
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

function isEquationSlotLocked(state: AddingGameState, locator: SlotLocator): boolean {
  if (locator.kind !== "equation") return false;
  if (!state.round) return false;
  return findEquationSlot(state.round.equation, locator.id)?.locked === true;
}

// Write a cardId to whichever equation slot owns `id` — operandSlots OR
// the R9 verdictSlot. Returns the next equation with EXACTLY ONE slot
// mutated (others passed through unchanged). Slot id not found → equation
// returned untouched.
function setEquationSlotCardId(equation: Equation, id: string, cardId: string | null): Equation {
  if (equation.operandSlots.some((s) => s.id === id)) {
    return {
      ...equation,
      operandSlots: setEquationCardId(equation.operandSlots, id, cardId),
    };
  }
  if (equation.verdictSlot?.id === id) {
    return { ...equation, verdictSlot: { ...equation.verdictSlot, cardId } };
  }
  return equation;
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
// Self-swap (same locator) is a no-op; missing round is a no-op. Locked
// equation slots (find-missing-result static operand, true-false-multiply
// LHS factors AND product) refuse swaps in EITHER direction — defense in
// depth on top of drag.tsx skipping their handlers.
export function applySwap(
  state: AddingGameState,
  source: SlotLocator,
  target: SlotLocator,
): AddingGameState {
  if (slotLocatorEquals(source, target)) return state;
  if (!state.round) return state;
  if (isEquationSlotLocked(state, source) || isEquationSlotLocked(state, target)) {
    return state;
  }

  const sourceCardId = readCardId(state, source);
  const targetCardId = readCardId(state, target);

  let nextHand: readonly HandSlot[] = state.player.hand;
  let nextEquation: Equation = state.round.equation;

  if (source.kind === "hand") nextHand = setHandCardId(nextHand, source.id, targetCardId);
  else nextEquation = setEquationSlotCardId(nextEquation, source.id, targetCardId);

  if (target.kind === "hand") nextHand = setHandCardId(nextHand, target.id, sourceCardId);
  else nextEquation = setEquationSlotCardId(nextEquation, target.id, sourceCardId);

  // Any drag activity invalidates a prior evaluation — reset back to matching
  // and clear the outcome so the next Evaluate click re-computes against the
  // new arrangement. This lets the player iterate without a separate "Try
  // Again" affordance.
  return {
    ...state,
    player: { ...state.player, hand: [...nextHand] },
    round: {
      ...state.round,
      equation: nextEquation,
      phase: "matching",
      outcome: null,
    },
  };
}
