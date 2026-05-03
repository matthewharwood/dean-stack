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
