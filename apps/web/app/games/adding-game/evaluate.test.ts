import { describe, expect, test } from "bun:test";
import { ADDING_GAME_DEFAULT, type AddingGameState } from "@dean-stack/schemas";

import { dealRound } from "./deal";
import { evaluateRound } from "./evaluate";
import { findLevel } from "./levels";
import { applySwap } from "./swap";

// Level 1 is the entry-level: add / eq / target 6 / hp 6 / range 1-5.
const LEVEL_1_TARGET = 6;

function makeState(): AddingGameState {
  const result = dealRound({ levelIndex: 1, random: () => 0.5 });
  return {
    ...ADDING_GAME_DEFAULT,
    status: "playing",
    cards: result.cards,
    player: { ...ADDING_GAME_DEFAULT.player, hand: result.hand },
    round: result.round,
  };
}

function findPair(state: AddingGameState, target: number): [number, number] {
  const values = state.player.hand.map((slot) =>
    slot.cardId ? (state.cards[slot.cardId]?.value ?? 0) : 0,
  );
  for (let a = 0; a < values.length; a++) {
    for (let b = a + 1; b < values.length; b++) {
      const va = values[a];
      const vb = values[b];
      if (va !== undefined && vb !== undefined && va + vb === target) return [a, b];
    }
  }
  throw new Error("no pair sums to target — dealRound contract violated");
}

describe("evaluateRound", () => {
  test("returns null when no round is active", () => {
    expect(evaluateRound(ADDING_GAME_DEFAULT)).toBeNull();
  });

  test("empty operand slots evaluate to 0 against the level-1 target → loss", () => {
    const result = evaluateRound(makeState());
    expect(result?.computedValue).toBe(0);
    expect(result?.expectedValue).toBe(LEVEL_1_TARGET);
    expect(result?.won).toBe(false);
    expect(result?.scoreEarned).toBe(0);
  });

  test("placing two cards summing to target wins and awards damage = target", () => {
    let state = makeState();
    const [i, j] = findPair(state, LEVEL_1_TARGET);
    state = applySwap(state, { kind: "hand", id: `hand:${i}` }, { kind: "equation", id: "eq:0" });
    state = applySwap(state, { kind: "hand", id: `hand:${j}` }, { kind: "equation", id: "eq:1" });

    const result = evaluateRound(state);
    expect(result?.won).toBe(true);
    expect(result?.computedValue).toBe(LEVEL_1_TARGET);
    expect(result?.scoreEarned).toBe(LEVEL_1_TARGET);
  });

  test("partial: one operand filled — computed = filled value, no win", () => {
    let state = makeState();
    const [i] = findPair(state, LEVEL_1_TARGET);
    state = applySwap(state, { kind: "hand", id: `hand:${i}` }, { kind: "equation", id: "eq:0" });

    const result = evaluateRound(state);
    const filledValue = state.cards[state.round?.equation.operandSlots[0]?.cardId ?? ""]?.value;
    expect(result?.computedValue).toBe(filledValue ?? 0);
    expect(result?.won).toBe(false);
  });

  test("level config drives the evaluator's expected target", () => {
    // Verify the test's assumption: level 1 really is target 6.
    expect(findLevel(1)?.target).toBe(LEVEL_1_TARGET);
    expect(findLevel(1)?.operator).toBe("add");
    expect(findLevel(1)?.comparator).toBe("eq");
  });
});

// ── R5 / R6: find-missing-result ─────────────────────────────────────────
// Level 24: R5, glass-manta, "1 + ? = ?" (position=first, static=1, add).
// Level 29: R6, glass-manta, "6 - ? = ?" (position=first, static=6, sub).
// Both rounds cap operand AND result cards at 1–5.
describe("evaluateRound — find-missing-result (R5)", () => {
  function makeR5State(): AddingGameState {
    const dealt = dealRound({ levelIndex: 24, random: () => 0.5 });
    return {
      ...ADDING_GAME_DEFAULT,
      status: "playing",
      cards: dealt.cards,
      player: { ...ADDING_GAME_DEFAULT.player, hand: dealt.hand },
      round: dealt.round,
    };
  }

  test("empty operand AND empty result → computed=staticValue, expected=0, no win", () => {
    // Static is locked into operandSlots[0] with value 1. operandSlots[1]
    // is empty (counts as 0). operandSlots[2] is empty (counts as 0).
    // computed = 1 + 0 = 1, result = 0 → no win.
    const state = makeR5State();
    const r = evaluateRound(state);
    expect(r?.computedValue).toBe(1);
    expect(r?.expectedValue).toBe(0);
    expect(r?.won).toBe(false);
    expect(r?.scoreEarned).toBe(0);
  });

  test("placing operand=3 and result=4 wins (1 + 3 = 4) with damage=4", () => {
    let state = makeR5State();
    // Inject controlled cards into hand by mutation — we know HAND_SIZE = 5.
    const handIds = state.player.hand.map((s) => s.cardId).filter((id): id is string => !!id);
    expect(handIds.length).toBe(5);
    const operandCardId = handIds[0]!;
    const resultCardId = handIds[1]!;
    state = {
      ...state,
      cards: {
        ...state.cards,
        [operandCardId]: { id: operandCardId, value: 3 },
        [resultCardId]: { id: resultCardId, value: 4 },
      },
    };
    // Place operand (value 3) into the unlocked LHS slot (eq:1) and the
    // result (value 4) into eq:result.
    state = applySwap(state, { kind: "hand", id: "hand:0" }, { kind: "equation", id: "eq:1" });
    state = applySwap(state, { kind: "hand", id: "hand:1" }, { kind: "equation", id: "eq:result" });

    const r = evaluateRound(state);
    expect(r?.won).toBe(true);
    expect(r?.computedValue).toBe(4); // 1 + 3
    expect(r?.expectedValue).toBe(4); // result slot value
    expect(r?.scoreEarned).toBe(4); // damage = result
  });

  test("inconsistent operand/result loses (1 + 3 = 4 ≠ 5)", () => {
    let state = makeR5State();
    const handIds = state.player.hand.map((s) => s.cardId).filter((id): id is string => !!id);
    const operandCardId = handIds[0]!;
    const resultCardId = handIds[1]!;
    state = {
      ...state,
      cards: {
        ...state.cards,
        [operandCardId]: { id: operandCardId, value: 3 },
        [resultCardId]: { id: resultCardId, value: 5 },
      },
    };
    state = applySwap(state, { kind: "hand", id: "hand:0" }, { kind: "equation", id: "eq:1" });
    state = applySwap(state, { kind: "hand", id: "hand:1" }, { kind: "equation", id: "eq:result" });

    const r = evaluateRound(state);
    expect(r?.won).toBe(false);
    expect(r?.computedValue).toBe(4); // 1 + 3
    expect(r?.expectedValue).toBe(5); // result slot
  });

  test("locked slot refuses applySwap from the kid's hand", () => {
    const state = makeR5State();
    // Try to swap a hand card into the LOCKED equation slot 0. applySwap
    // must return state unchanged.
    const after = applySwap(
      state,
      { kind: "hand", id: "hand:0" },
      { kind: "equation", id: "eq:0" },
    );
    expect(after).toBe(state);
  });
});

describe("evaluateRound — find-missing-result (R6, subtract)", () => {
  function makeR6State(): AddingGameState {
    const dealt = dealRound({ levelIndex: 29, random: () => 0.5 });
    return {
      ...ADDING_GAME_DEFAULT,
      status: "playing",
      cards: dealt.cards,
      player: { ...ADDING_GAME_DEFAULT.player, hand: dealt.hand },
      round: dealt.round,
    };
  }

  test("6 − 2 = 4 wins, damage = 4", () => {
    let state = makeR6State();
    const handIds = state.player.hand.map((s) => s.cardId).filter((id): id is string => !!id);
    const operandCardId = handIds[0]!;
    const resultCardId = handIds[1]!;
    state = {
      ...state,
      cards: {
        ...state.cards,
        [operandCardId]: { id: operandCardId, value: 2 },
        [resultCardId]: { id: resultCardId, value: 4 },
      },
    };
    state = applySwap(state, { kind: "hand", id: "hand:0" }, { kind: "equation", id: "eq:1" });
    state = applySwap(state, { kind: "hand", id: "hand:1" }, { kind: "equation", id: "eq:result" });

    const r = evaluateRound(state);
    expect(r?.won).toBe(true);
    expect(r?.computedValue).toBe(4);
    expect(r?.expectedValue).toBe(4);
    expect(r?.scoreEarned).toBe(4);
  });
});
