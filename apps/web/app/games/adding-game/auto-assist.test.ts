import { describe, expect, test } from "bun:test";
import { ADDING_GAME_DEFAULT, type AddingGameState, numberCardValue } from "@dean-stack/schemas";

import { applyAutoAssist } from "./auto-assist";
import { dealRound } from "./deal";
import { applySwap } from "./swap";

// Build a state parked at a specific level with controlled hand-card values.
// The dealer's pseudo-random seed determines which slot the static lands in
// (eq:0 for position=first); we then overwrite hand card values so the
// assist's pair-finding is deterministic.
function makeState(levelIndex: number): AddingGameState {
  const dealt = dealRound({ levelIndex, random: () => 0.5 });
  return {
    ...ADDING_GAME_DEFAULT,
    status: "playing",
    cards: dealt.cards,
    player: { ...ADDING_GAME_DEFAULT.player, hand: dealt.hand },
    round: dealt.round,
  };
}

function setHandValue(state: AddingGameState, handIdx: number, value: number): AddingGameState {
  const slot = state.player.hand[handIdx];
  if (!slot?.cardId) throw new Error(`hand[${handIdx}] has no card`);
  return {
    ...state,
    cards: { ...state.cards, [slot.cardId]: { id: slot.cardId, kind: "number", value } },
  };
}

describe("applyAutoAssist", () => {
  test("returns null for find-sum equations (R1–R4)", () => {
    const state = makeState(1); // level 1: find-sum
    expect(applyAutoAssist(state)).toBeNull();
  });

  test("level 24 (1 + ? = ?): both kid-slots empty → places operand `a` and locks it", () => {
    // Plant a deterministic pair (a=2, b=3) so the assist has something
    // to reach for. Static is 1 → 1 + 2 = 3.
    let state = makeState(24);
    state = setHandValue(state, 0, 2);
    state = setHandValue(state, 1, 3);

    const next = applyAutoAssist(state);
    expect(next).not.toBeNull();
    if (!next?.round) throw new Error("expected a round");

    // operandSlot is eq:1 (since position=first puts the static at eq:0).
    const operandSlot = next.round.equation.operandSlots.find((s) => s.id === "eq:1");
    expect(operandSlot?.locked).toBe(true);
    expect(operandSlot?.cardId).not.toBeNull();
    if (operandSlot?.cardId) {
      expect(numberCardValue(next.cards[operandSlot.cardId])).toBe(2);
    }

    // Result slot stays untouched + unlocked.
    const resultSlot = next.round.equation.operandSlots.find((s) => s.id === "eq:result");
    expect(resultSlot?.locked).toBe(false);
    expect(resultSlot?.cardId).toBeNull();
  });

  test("operand already correctly placed → assist falls through to result", () => {
    let state = makeState(24);
    state = setHandValue(state, 0, 2); // a (will go into operand)
    state = setHandValue(state, 1, 3); // b (will go into result)

    // Manually place operand (no lock) so it looks like the kid placed it
    // correctly but their result is wrong.
    state = applySwap(state, { kind: "hand", id: "hand:0" }, { kind: "equation", id: "eq:1" });
    // Lock the operand slot — simulating a previous assist call having
    // already fired on operand. Manually patch the round (the route does
    // this through `applyAutoAssist`'s own lock step).
    if (!state.round) throw new Error("no round");
    state = {
      ...state,
      round: {
        ...state.round,
        equation: {
          ...state.round.equation,
          operandSlots: state.round.equation.operandSlots.map((s) =>
            s.id === "eq:1" ? { ...s, locked: true } : s,
          ),
        },
      },
    };

    // Re-fire — should now lock result with the matching `b`.
    const next = applyAutoAssist(state);
    expect(next).not.toBeNull();
    if (!next?.round) throw new Error("expected a round");
    const resultSlot = next.round.equation.operandSlots.find((s) => s.id === "eq:result");
    expect(resultSlot?.locked).toBe(true);
    expect(resultSlot?.cardId).not.toBeNull();
    if (resultSlot?.cardId) {
      expect(numberCardValue(next.cards[resultSlot.cardId])).toBe(3);
    }
  });

  test("both kid-slots already locked → returns null (cap reached)", () => {
    let state = makeState(24);
    state = setHandValue(state, 0, 2);
    state = setHandValue(state, 1, 3);
    if (!state.round) throw new Error("no round");
    // Pretend the assist has already fired twice, locking both.
    state = {
      ...state,
      round: {
        ...state.round,
        equation: {
          ...state.round.equation,
          operandSlots: state.round.equation.operandSlots.map((s) =>
            s.id === "eq:1" || s.id === "eq:result" ? { ...s, locked: true } : s,
          ),
        },
      },
    };
    expect(applyAutoAssist(state)).toBeNull();
  });

  test("level 29 (6 − ? = ?, subtract): finds a valid sub pair and locks operand", () => {
    let state = makeState(29);
    // Static=6, operator=subtract. Need (a, b) with 6 − a = b, both in [1,5].
    // Use (a=1, b=5) — clean answer.
    state = setHandValue(state, 0, 1);
    state = setHandValue(state, 1, 5);

    const next = applyAutoAssist(state);
    expect(next).not.toBeNull();
    if (!next?.round) throw new Error("no round");
    const operandSlot = next.round.equation.operandSlots.find((s) => s.id === "eq:1");
    expect(operandSlot?.locked).toBe(true);
    if (operandSlot?.cardId) {
      expect(numberCardValue(next.cards[operandSlot.cardId])).toBe(1);
    }
  });

  test("first assist evicts the kid's wrong result-slot card back to the hand", () => {
    // Setup: kid has placed a (correctly) into operand AND a wrong card
    // into result. Assist will lock operand, but the user wants the
    // board CLEARED of the kid's other tries — wrong result card must
    // return to a hand slot.
    let state = makeState(24);
    state = setHandValue(state, 0, 2); // a
    state = setHandValue(state, 1, 3); // matching b
    state = setHandValue(state, 2, 5); // wrong b the kid placed in result

    // Kid places a in operand.
    state = applySwap(state, { kind: "hand", id: "hand:0" }, { kind: "equation", id: "eq:1" });
    // Kid places wrong card (5) in result.
    state = applySwap(state, { kind: "hand", id: "hand:2" }, { kind: "equation", id: "eq:result" });

    // Pre-assist sanity: result has a card.
    if (!state.round) throw new Error("no round");
    const preResult = state.round.equation.operandSlots.find((s) => s.id === "eq:result");
    expect(preResult?.cardId).not.toBeNull();

    const next = applyAutoAssist(state);
    expect(next).not.toBeNull();
    if (!next?.round) throw new Error("expected a round");

    // Operand is locked, value 2 is in there.
    const operand = next.round.equation.operandSlots.find((s) => s.id === "eq:1");
    expect(operand?.locked).toBe(true);

    // Result slot was unlocked + filled with the wrong card; assist
    // should have evicted it back to the hand.
    const result = next.round.equation.operandSlots.find((s) => s.id === "eq:result");
    expect(result?.locked).toBe(false);
    expect(result?.cardId).toBeNull();

    // The wrong card (value 5) is back in some hand slot.
    const handValues = next.player.hand.flatMap((h) => {
      const value = h.cardId ? numberCardValue(next.cards[h.cardId]) : null;
      return value == null ? [] : [value];
    });
    expect(handValues).toContain(5);
  });

  test("after assist, applySwap on the locked slot is rejected (defense in depth)", () => {
    let state = makeState(24);
    state = setHandValue(state, 0, 2);
    state = setHandValue(state, 1, 3);
    const after = applyAutoAssist(state);
    expect(after).not.toBeNull();
    if (!after) throw new Error("no assist");

    // Try to drag from hand into the now-locked operand slot.
    const dragged = applySwap(
      after,
      { kind: "hand", id: "hand:2" },
      { kind: "equation", id: "eq:1" },
    );
    expect(dragged).toBe(after);
  });
});
