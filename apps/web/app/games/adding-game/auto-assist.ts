import { type AddingGameState, type EquationSlot, isNumberCard } from "@dean-stack/schemas";

import { applySwap, type SlotLocator } from "./swap";

// First locked slot in a fixed pair, or null when neither is locked.
// Hoisted helper so call sites don't read as a nested ternary.
function firstLocked(a: EquationSlot, b: EquationSlot): EquationSlot | null {
  if (a.locked) return a;
  if (b.locked) return b;
  return null;
}

// Auto-assist for find-missing-result rounds (R5/R6).
//
// When the kid loses 3+ evaluations on the same stage the route fires this
// once per stage. The function:
//   1. Identifies the kid's two droppable slots — operand (the unlocked
//      LHS) and result (the RHS).
//   2. Scans every kid-controlled card (hand + unlocked equation slots)
//      for a valid (a, b) pair satisfying `static OP a == b`. The dealer
//      guarantees such a pair exists at deal time; the assist scans
//      hand+equation so it still works after the kid has dragged cards
//      into the slots.
//   3. Decides which slot to fill:
//        - Operand if it isn't already locked by a previous assist.
//        - Otherwise result.
//      "One card per stage" is enforced naturally: the second time the
//      route calls this on the same stage, operand is already locked, so
//      the assist falls through to result. A third call returns null
//      because both kid-slots are locked.
//   4. Moves the chosen card into the chosen slot via `applySwap` (so the
//      displaced card returns to the source location), then sets
//      `slot.locked = true`.
//
// Returns `null` for find-sum equations, when both kid-slots are already
// locked, or when no valid pair is found in kid-controlled cards (which
// would indicate a dealer bug — covered by the levels-coverage test).

type CardLocation = { kind: "hand"; slotId: string } | { kind: "equation"; slotId: string };

type CardEntry = {
  cardId: string;
  value: number;
  location: CardLocation;
};

export function applyAutoAssist(state: AddingGameState): AddingGameState | null {
  const round = state.round;
  if (!round) return null;
  const equation = round.equation;
  if (equation.shape !== "find-missing-result") return null;

  const slots = equation.operandSlots;
  const [s0, s1, s2] = slots;
  if (slots.length !== 3 || !s0 || !s1 || !s2) return null;

  // Identify which LHS slot holds the static (locked) and which is the
  // kid's operand (unlocked at deal time, possibly locked by a previous
  // assist).
  const lockedLhs: EquationSlot | null = firstLocked(s0, s1);
  const operandSlot: EquationSlot | null = s0.locked ? s1 : s0;
  const resultSlot: EquationSlot = s2;
  if (!lockedLhs || !operandSlot) return null;

  // Both kid-slots already locked → the assist already fired up to its
  // cap. The route shouldn't call this again, but guard regardless.
  if (operandSlot.locked && resultSlot.locked) return null;

  const cardValue = (cardId: string | null): number | null => {
    if (!cardId) return null;
    const c = state.cards[cardId];
    return c && isNumberCard(c) ? c.value : null;
  };
  const staticValue = cardValue(lockedLhs.cardId) ?? 0;
  const operator = equation.operator;

  // Collect every kid-controlled card with its current location.
  const kidCards: CardEntry[] = [];
  for (const handSlot of state.player.hand) {
    if (!handSlot.cardId) continue;
    const value = cardValue(handSlot.cardId);
    if (value === null) continue;
    kidCards.push({
      cardId: handSlot.cardId,
      value,
      location: { kind: "hand", slotId: handSlot.id },
    });
  }
  if (!operandSlot.locked && operandSlot.cardId) {
    const value = cardValue(operandSlot.cardId);
    if (value !== null) {
      kidCards.push({
        cardId: operandSlot.cardId,
        value,
        location: { kind: "equation", slotId: operandSlot.id },
      });
    }
  }
  if (!resultSlot.locked && resultSlot.cardId) {
    const value = cardValue(resultSlot.cardId);
    if (value !== null) {
      kidCards.push({
        cardId: resultSlot.cardId,
        value,
        location: { kind: "equation", slotId: resultSlot.id },
      });
    }
  }

  const compute = (a: number): number => (operator === "add" ? staticValue + a : staticValue - a);

  // Decide which slot we're filling AND which card we're sourcing.
  //
  // - Operand still unlocked → first assist on this stage. Pick any
  //   valid (a, b) pair from kidCards and place `a` into operand. The
  //   kid is left to find `b` themselves (it's still somewhere in
  //   kidCards by dealer guarantee).
  // - Operand already locked → second assist call. The result we place
  //   MUST satisfy `static OP operand_value == result`. Otherwise we'd
  //   commit a wrong equation under the kid's feet. We compute the
  //   expected result from the LOCKED operand's value, then find that
  //   card in kidCards.
  let sourceCard: CardEntry | null = null;
  let destSlotId: string;
  if (!operandSlot.locked) {
    destSlotId = operandSlot.id;
    // Pre-index by value so the inner `bMatch` lookup is O(1) instead of
    // re-scanning kidCards on every aCandidate. Same-value duplicates collapse
    // to the first occurrence — matches the original `.find()` semantics.
    const cardsByValue = new Map<number, CardEntry>();
    for (const c of kidCards) {
      if (!cardsByValue.has(c.value)) cardsByValue.set(c.value, c);
    }
    for (const aCandidate of kidCards) {
      const expectedB = compute(aCandidate.value);
      const bMatch = cardsByValue.get(expectedB);
      if (bMatch && bMatch.cardId !== aCandidate.cardId) {
        sourceCard = aCandidate;
        break;
      }
    }
  } else {
    destSlotId = resultSlot.id;
    const operandValue = cardValue(operandSlot.cardId);
    if (operandValue === null) return null;
    const expectedB = compute(operandValue);
    sourceCard = kidCards.find((c) => c.value === expectedB) ?? null;
  }
  if (!sourceCard) return null;

  // Place the chosen card. If it's already in the destination slot
  // (the kid had picked the right card by accident but in the wrong
  // combination), we still need to LOCK that slot AND clear the board.
  // Otherwise we move via applySwap, which respects locked targets
  // (we're targeting an unlocked slot here, so the swap goes through)
  // AND resets the round to phase=matching, outcome=null — desired,
  // since the equation just changed under the kid's feet and they need
  // a fresh evaluate.
  let placed: AddingGameState;
  if (sourceCard.location.kind === "equation" && sourceCard.location.slotId === destSlotId) {
    placed = state;
  } else {
    const sourceLocator: SlotLocator =
      sourceCard.location.kind === "hand"
        ? { kind: "hand", id: sourceCard.location.slotId }
        : { kind: "equation", id: sourceCard.location.slotId };
    const destLocator: SlotLocator = { kind: "equation", id: destSlotId };
    placed = applySwap(state, sourceLocator, destLocator);
  }
  const locked = lockEquationSlot(placed, destSlotId);
  // Reset the board: every OTHER unlocked equation slot that still has
  // a card gets its card returned to the hand. The kid is forced to
  // start the equation over with only the assist-locked card on the
  // board, so they have to think the answer through from scratch.
  // Skips locked slots (the static AND the just-assisted slot) and
  // stops once the hand has no empty slots — which can only happen if
  // HAND_SIZE shrinks below the equation's slot count, currently
  // impossible (5 vs 3).
  return evictUnlockedEquationCardsToHand(locked);
}

function evictUnlockedEquationCardsToHand(state: AddingGameState): AddingGameState {
  if (!state.round) return state;
  let working = state;
  // Pre-collect the empty-hand slot ids so we don't re-scan the hand on every
  // operand iteration. applySwap returns a new state where one of these slots
  // is now filled, so we step the index forward as we consume them.
  const emptyHandIds: string[] = [];
  for (const h of working.player.hand) {
    if (!h.cardId) emptyHandIds.push(h.id);
  }
  let nextEmptyIdx = 0;
  for (const slot of state.round.equation.operandSlots) {
    if (slot.locked) continue;
    if (!slot.cardId) continue;
    const emptyHandId = emptyHandIds[nextEmptyIdx];
    if (!emptyHandId) break;
    nextEmptyIdx += 1;
    working = applySwap(
      working,
      { kind: "equation", id: slot.id },
      { kind: "hand", id: emptyHandId },
    );
  }
  return working;
}

function lockEquationSlot(state: AddingGameState, slotId: string): AddingGameState {
  if (!state.round) return state;
  return {
    ...state,
    round: {
      ...state.round,
      equation: {
        ...state.round.equation,
        operandSlots: state.round.equation.operandSlots.map((s) =>
          s.id === slotId ? { ...s, locked: true } : s,
        ),
      },
    },
  };
}
