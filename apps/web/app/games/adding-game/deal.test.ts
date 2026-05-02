import { describe, expect, test } from "bun:test";
import { HAND_SIZE } from "@dean-stack/schemas";

import { dealRound } from "./deal";

// Deterministic LCG so each test seed reproduces exactly.
function seededRandom(seed: number): () => number {
  let x = seed >>> 0;
  return () => {
    x = (x * 1103515245 + 12345) >>> 0;
    return (x & 0x7fffffff) / 0x7fffffff;
  };
}

function hasPairSummingTo(values: readonly number[], target: number): boolean {
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      const a = values[i];
      const b = values[j];
      if (a !== undefined && b !== undefined && a + b === target) return true;
    }
  }
  return false;
}

describe("dealRound", () => {
  test("hand has exactly HAND_SIZE cards", () => {
    const result = dealRound({ index: 1, target: 10, random: seededRandom(1) });
    expect(result.hand).toHaveLength(HAND_SIZE);
  });

  test("every hand slot is filled with a cardId", () => {
    const result = dealRound({ index: 1, target: 10, random: seededRandom(2) });
    for (const slot of result.hand) {
      expect(slot.cardId).not.toBeNull();
    }
  });

  test("at least one pair of hand cards sums to target", () => {
    // Sweep many seeds — every deal must satisfy the contract.
    for (let seed = 1; seed <= 50; seed++) {
      const result = dealRound({ index: 1, target: 10, random: seededRandom(seed) });
      const values = result.hand
        .map((slot) => (slot.cardId ? result.cards[slot.cardId]?.value : undefined))
        .filter((v): v is number => v !== undefined);
      expect(hasPairSummingTo(values, 10)).toBe(true);
    }
  });

  test("equation has 2 empty operand slots and a target card matching `target`", () => {
    const result = dealRound({ index: 1, target: 10, random: seededRandom(3) });
    expect(result.round.equation.operandSlots).toHaveLength(2);
    expect(result.round.equation.operandSlots[0]?.cardId).toBeNull();
    expect(result.round.equation.operandSlots[1]?.cardId).toBeNull();
    expect(result.round.equation.target.value).toBe(10);
    expect(result.round.equation.operator).toBe("add");
  });

  test("all card ids in the catalog are unique", () => {
    const result = dealRound({ index: 1, target: 10, random: seededRandom(4) });
    const ids = Object.keys(result.cards);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("round metadata is correct after deal", () => {
    const result = dealRound({ index: 7, target: 10, random: seededRandom(5) });
    expect(result.round.index).toBe(7);
    expect(result.round.phase).toBe("matching");
    expect(result.round.outcome).toBeNull();
  });

  test("card ids carry the round index so different rounds don't collide", () => {
    const r1 = dealRound({ index: 1, target: 10, random: seededRandom(6) });
    const r2 = dealRound({ index: 2, target: 10, random: seededRandom(6) });
    for (const id of Object.keys(r1.cards)) {
      expect(r2.cards[id]).toBeUndefined();
    }
  });
});
