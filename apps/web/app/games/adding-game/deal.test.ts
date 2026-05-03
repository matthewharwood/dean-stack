import { describe, expect, test } from "bun:test";
import type { Comparator, Operator } from "@dean-stack/schemas";
import { HAND_SIZE } from "@dean-stack/schemas";

import { dealRound } from "./deal";
import { LEVELS } from "./levels";

// Deterministic LCG so each test seed reproduces exactly.
function seededRandom(seed: number): () => number {
  let x = seed >>> 0;
  return () => {
    x = (x * 1103515245 + 12345) >>> 0;
    return (x & 0x7fffffff) / 0x7fffffff;
  };
}

// Sweep all ordered (a, b) pairs in `values` and check whether ANY of
// them satisfies `a op b cmp target`. Ordered pairs because subtraction
// isn't commutative — (3, 5) and (5, 3) are distinct candidates.
function hasValidPair(
  values: readonly number[],
  operator: Operator,
  comparator: Comparator,
  target: number,
): boolean {
  const op = (a: number, b: number): number => {
    if (operator === "add") return a + b;
    if (operator === "subtract") return a - b;
    if (operator === "multiply") return a * b;
    return b === 0 ? Number.NaN : a / b;
  };
  const cmp = (c: number): boolean => {
    if (Number.isNaN(c)) return false;
    if (comparator === "eq") return c === target;
    if (comparator === "gt") return c > target;
    return c < target;
  };
  for (let i = 0; i < values.length; i++) {
    for (let j = 0; j < values.length; j++) {
      if (i === j) continue;
      const a = values[i];
      const b = values[j];
      if (a !== undefined && b !== undefined && cmp(op(a, b))) return true;
    }
  }
  return false;
}

function handValues(result: ReturnType<typeof dealRound>): number[] {
  return result.hand
    .map((slot) => (slot.cardId ? result.cards[slot.cardId]?.value : undefined))
    .filter((v): v is number => v !== undefined);
}

describe("dealRound — level 1 (round 1 opener, add target 6)", () => {
  test("hand has exactly HAND_SIZE cards, all filled", () => {
    const result = dealRound({ levelIndex: 1, random: seededRandom(1) });
    expect(result.hand).toHaveLength(HAND_SIZE);
    for (const slot of result.hand) {
      expect(slot.cardId).not.toBeNull();
    }
  });

  test("at least one pair of hand cards sums to 6 across many seeds", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const result = dealRound({ levelIndex: 1, random: seededRandom(seed) });
      expect(hasValidPair(handValues(result), "add", "eq", 6)).toBe(true);
    }
  });

  test("equation operator and target match the level config", () => {
    const result = dealRound({ levelIndex: 1, random: seededRandom(3) });
    expect(result.round.equation.operandSlots).toHaveLength(2);
    expect(result.round.equation.operandSlots[0]?.cardId).toBeNull();
    expect(result.round.equation.operandSlots[1]?.cardId).toBeNull();
    expect(result.round.equation.target.value).toBe(6);
    expect(result.round.equation.operator).toBe("add");
    expect(result.round.equation.comparator).toBe("eq");
  });

  test("enemy is seeded from the level's enemyId at the level's hp", () => {
    const result = dealRound({ levelIndex: 1, random: seededRandom(4) });
    expect(result.round.enemy?.templateId).toBe("hadal-tide-minnow-echo");
    // Level 1 hp is 6 (level config), not the template's baseline maxHp.
    expect(result.round.enemy?.hp).toBe(6);
  });
});

describe("dealRound — every level produces a solvable hand", () => {
  // Sweep all levels × 20 seeds. Every deal must satisfy its operator +
  // comparator constraint — this is the load-bearing dealer contract.
  for (const level of LEVELS) {
    test(`level ${level.index} (${level.operator} ${level.comparator} ${level.target}) generates a valid pair`, () => {
      for (let seed = 1; seed <= 20; seed++) {
        const result = dealRound({ levelIndex: level.index, random: seededRandom(seed) });
        const ok = hasValidPair(handValues(result), level.operator, level.comparator, level.target);
        expect(ok).toBe(true);
      }
    });
  }
});

describe("dealRound — invariants", () => {
  test("all card ids in the catalog are unique", () => {
    const result = dealRound({ levelIndex: 1, random: seededRandom(7) });
    const ids = Object.keys(result.cards);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("round.index reflects the levelIndex argument", () => {
    const result = dealRound({ levelIndex: 6, random: seededRandom(8) });
    expect(result.round.index).toBe(6);
    expect(result.round.phase).toBe("matching");
    expect(result.round.outcome).toBeNull();
  });

  test("rejects an invalid level index", () => {
    expect(() => dealRound({ levelIndex: 99, random: seededRandom(9) })).toThrow();
  });
});
