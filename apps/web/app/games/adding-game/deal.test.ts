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

// find-missing-result solvability: there must exist `a` in the hand AND
// `b` in the hand such that `static OP a == b` (or `a OP static == b` when
// position == "second"). Two cards from the kid's 5; static is in the
// equation, NOT the hand.
function hasValidMissingResultPair(
  values: readonly number[],
  operator: Operator,
  staticValue: number,
  position: "first" | "second",
): boolean {
  for (let i = 0; i < values.length; i++) {
    for (let j = 0; j < values.length; j++) {
      if (i === j) continue;
      const a = values[i];
      const b = values[j];
      if (a === undefined || b === undefined) continue;
      let lhs: number;
      if (operator === "add") {
        lhs = position === "first" ? staticValue + a : a + staticValue;
      } else if (operator === "subtract") {
        lhs = position === "first" ? staticValue - a : a - staticValue;
      } else {
        return false;
      }
      if (lhs === b) return true;
    }
  }
  return false;
}

function handValues(result: ReturnType<typeof dealRound>): number[] {
  // Single pass: map+filter collapsed into flatMap. `[]` skips empty slots /
  // missing cards; `[value]` keeps real values. Equivalent semantics, one walk.
  return result.hand.flatMap((slot) => {
    const value = slot.cardId ? result.cards[slot.cardId]?.value : undefined;
    return value === undefined ? [] : [value];
  });
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
    expect(result.round.equation.shape).toBe("find-sum");
    expect(result.round.equation.operandSlots).toHaveLength(2);
    expect(result.round.equation.operandSlots[0]?.cardId).toBeNull();
    expect(result.round.equation.operandSlots[0]?.locked).toBe(false);
    expect(result.round.equation.operandSlots[1]?.cardId).toBeNull();
    expect(result.round.equation.target?.value).toBe(6);
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
  // Sweep all levels × 20 seeds. Every deal must satisfy its
  // shape-appropriate constraint — load-bearing dealer contract.
  for (const level of LEVELS) {
    const shape = level.equationShape ?? "find-sum";
    test(`level ${level.index} (${shape}, ${level.operator} ${level.comparator} ${level.target}) generates a valid hand`, () => {
      for (let seed = 1; seed <= 20; seed++) {
        const result = dealRound({ levelIndex: level.index, random: seededRandom(seed) });
        if (shape === "find-missing-result") {
          if (!level.staticOperand) {
            throw new Error("test fixture: find-missing-result level missing staticOperand");
          }
          const ok = hasValidMissingResultPair(
            handValues(result),
            level.operator,
            level.staticOperand.value,
            level.staticOperand.position,
          );
          expect(ok).toBe(true);
        } else {
          const ok = hasValidPair(
            handValues(result),
            level.operator,
            level.comparator,
            level.target,
          );
          expect(ok).toBe(true);
        }
      }
    });
  }
});

describe("dealRound — find-missing-result equation shape (R5–R6)", () => {
  test("level 24 (R5: 1 + ? = ?, position=first) emits 3 operandSlots with first locked", () => {
    const result = dealRound({ levelIndex: 24, random: seededRandom(1) });
    const eq = result.round.equation;
    expect(eq.shape).toBe("find-missing-result");
    expect(eq.target).toBeNull();
    expect(eq.operandSlots).toHaveLength(3);

    const [s0, s1, s2] = eq.operandSlots;
    expect(s0?.locked).toBe(true);
    expect(s0?.cardId).not.toBeNull();
    expect(s1?.locked).toBe(false);
    expect(s1?.cardId).toBeNull();
    expect(s2?.locked).toBe(false);
    expect(s2?.cardId).toBeNull();

    // Static card in catalog has the right value.
    const staticCardId = s0?.cardId;
    expect(staticCardId).toBeTruthy();
    if (staticCardId) {
      expect(result.cards[staticCardId]?.value).toBe(1);
    }
  });

  test("level 25 (R5: ? + 2 = ?, position=second) locks operandSlots[1]", () => {
    const result = dealRound({ levelIndex: 25, random: seededRandom(2) });
    const eq = result.round.equation;
    const [s0, s1, s2] = eq.operandSlots;
    expect(s0?.locked).toBe(false);
    expect(s0?.cardId).toBeNull();
    expect(s1?.locked).toBe(true);
    expect(s1?.cardId).not.toBeNull();
    expect(s2?.locked).toBe(false);
    expect(s2?.cardId).toBeNull();

    const staticCardId = s1?.cardId;
    if (staticCardId) {
      expect(result.cards[staticCardId]?.value).toBe(2);
    }
  });

  test("level 29 (R6: 6 - ? = ?, subtract) emits subtract operator + 3 slots", () => {
    const result = dealRound({ levelIndex: 29, random: seededRandom(3) });
    const eq = result.round.equation;
    expect(eq.shape).toBe("find-missing-result");
    expect(eq.operator).toBe("subtract");
    expect(eq.operandSlots).toHaveLength(3);
    const s0 = eq.operandSlots[0];
    expect(s0?.locked).toBe(true);
    if (s0?.cardId) {
      expect(result.cards[s0.cardId]?.value).toBe(6);
    }
  });

  test("hand still has HAND_SIZE cards (static does NOT consume a hand slot)", () => {
    const result = dealRound({ levelIndex: 24, random: seededRandom(4) });
    expect(result.hand).toHaveLength(HAND_SIZE);
  });

  test("R5/R6 hand cards are all capped at 1..5 across many seeds", () => {
    // The 1–5 cap is the load-bearing tuning for these rounds. Sweeping
    // every R5/R6 level × 30 seeds ensures both the guaranteed pair AND
    // the fillers stay in range — a regression here would surface a
    // 6-card the kid can't possibly use.
    for (let levelIndex = 24; levelIndex <= 33; levelIndex++) {
      for (let seed = 1; seed <= 30; seed++) {
        const result = dealRound({ levelIndex, random: seededRandom(seed) });
        for (const value of handValues(result)) {
          expect(value).toBeGreaterThanOrEqual(1);
          expect(value).toBeLessThanOrEqual(5);
        }
      }
    }
  });
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
