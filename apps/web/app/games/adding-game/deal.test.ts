import { describe, expect, test } from "bun:test";
import type { Comparator, Operator } from "@dean-stack/schemas";
import { HAND_SIZE, numberCardValue } from "@dean-stack/schemas";

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
  // missing cards / verdict cards (R9); `[value]` keeps real number values.
  return result.hand.flatMap((slot) => {
    const value = slot.cardId ? numberCardValue(result.cards[slot.cardId]) : undefined;
    return value === undefined ? [] : [value];
  });
}

// Stepper slot index per factor-multiplication shape (R13/R14). R15
// (find-product) used to live here too but is multi-choice now, asserted
// separately by assertFindProductShape below.
type FactorStepperShape = "find-missing-factor" | "find-leading-factor";
const FACTOR_STEPPER_SLOT_INDEX: Record<FactorStepperShape, 0 | 1> = {
  "find-leading-factor": 0,
  "find-missing-factor": 1,
};

// Assert the structural invariants for R13 / R14: three locked
// NumberCard operand slots, empty hand, and a stepper that starts
// within 1..3 of the (still-unsolved) true answer.
function assertFactorStepperShape(
  result: ReturnType<typeof dealRound>,
  level: (typeof LEVELS)[number],
  shape: FactorStepperShape,
): void {
  for (const slot of result.hand) {
    expect(slot.cardId).toBeNull();
  }
  const [s0, s1, s2] = result.round.equation.operandSlots;
  if (!s0 || !s1 || !s2) {
    throw new Error(`${shape}: expected 3 operandSlots`);
  }
  expect(s0.locked).toBe(true);
  expect(s1.locked).toBe(true);
  expect(s2.locked).toBe(true);
  const c0 = s0.cardId ? result.cards[s0.cardId] : undefined;
  const c1 = s1.cardId ? result.cards[s1.cardId] : undefined;
  const c2 = s2.cardId ? result.cards[s2.cardId] : undefined;
  if (!c0 || !c1 || !c2 || c0.kind !== "number" || c1.kind !== "number" || c2.kind !== "number") {
    throw new Error(`${shape}: expected 3 NumberCards in operandSlots`);
  }
  const cards = [c0, c1, c2];
  const stepperIdx = FACTOR_STEPPER_SLOT_INDEX[shape];
  const stepperValue = cards[stepperIdx]!.value;
  const otherFactor = stepperIdx === 0 ? c1.value : c0.value;
  const answer = otherFactor === 0 ? 0 : c2.value / otherFactor;
  expect(otherFactor).toBeGreaterThan(0);
  expect(c2.value % otherFactor).toBe(0);
  expect(answer).toBeGreaterThanOrEqual(level.handValueRange.min);
  expect(answer).toBeLessThanOrEqual(level.handValueRange.max);
  // Locked non-stepper slots: factors stay 1..10; the locked product
  // slot (idx 2) can be up to 100 (10 × 10).
  for (let i = 0; i < 3; i++) {
    if (i === stepperIdx) continue;
    const v = cards[i]!.value;
    const upper = i === 2 ? 100 : 10;
    expect(v).toBeGreaterThanOrEqual(1);
    expect(v).toBeLessThanOrEqual(upper);
  }
  expect(stepperValue).toBeGreaterThanOrEqual(0);
  expect(stepperValue).toBeLessThanOrEqual(10);
  expect(stepperValue).not.toBe(answer);
  expect(Math.abs(stepperValue - answer)).toBeLessThanOrEqual(3);
  expect(Math.abs(stepperValue - answer)).toBeGreaterThanOrEqual(1);
}

// Assert the structural invariants for R15 multi-choice find-product:
// two locked factor slots, an empty kid-fillable answer slot, exactly
// 5 unique choice cards in equation.choices including the correct
// product (a × b), and no distractor within ±2 of the answer (so
// near-miss inference can't replace computation).
function assertFindProductShape(
  result: ReturnType<typeof dealRound>,
  level: (typeof LEVELS)[number],
): void {
  for (const slot of result.hand) {
    expect(slot.cardId).toBeNull();
  }
  const [aSlot, bSlot, ansSlot] = result.round.equation.operandSlots;
  if (!aSlot || !bSlot || !ansSlot) {
    throw new Error("find-product: expected 3 operandSlots");
  }
  expect(aSlot.locked).toBe(true);
  expect(bSlot.locked).toBe(true);
  expect(ansSlot.locked).toBe(false);
  expect(ansSlot.cardId).toBeNull();
  const aCard = aSlot.cardId ? result.cards[aSlot.cardId] : undefined;
  const bCard = bSlot.cardId ? result.cards[bSlot.cardId] : undefined;
  if (!aCard || !bCard || aCard.kind !== "number" || bCard.kind !== "number") {
    throw new Error("find-product: expected NumberCards at a and b");
  }
  expect(aCard.value).toBeGreaterThanOrEqual(level.handValueRange.min);
  expect(aCard.value).toBeLessThanOrEqual(level.handValueRange.max);
  expect(bCard.value).toBeGreaterThanOrEqual(level.handValueRange.min);
  expect(bCard.value).toBeLessThanOrEqual(level.handValueRange.max);
  const answer = aCard.value * bCard.value;
  const choices = result.round.equation.choices;
  expect(choices).toHaveLength(5);
  const values = choices.map((c) => (c.kind === "number" ? c.value : Number.NaN));
  for (const v of values) {
    expect(v).toBeGreaterThanOrEqual(1);
    expect(v).toBeLessThanOrEqual(100);
    expect(Number.isNaN(v)).toBe(false);
  }
  // Exactly one correct choice present.
  expect(values.filter((v) => v === answer)).toHaveLength(1);
  // All choices distinct.
  expect(new Set(values).size).toBe(5);
  // No distractor within ±2 of the answer (other than the answer itself).
  for (const v of values) {
    if (v === answer) continue;
    expect(Math.abs(v - answer)).toBeGreaterThanOrEqual(3);
  }
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
    expect(numberCardValue(result.round.equation.target)).toBe(6);
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
        } else if (shape === "true-false-multiply") {
          // R12 invariant: hand always contains exactly one TRUE and one
          // FALSE verdict card; remaining 3 slots are empty. The kid only
          // needs T or F — the dealer doesn't plant a numeric pair.
          const verdicts = result.hand.flatMap((slot) => {
            if (!slot.cardId) return [];
            const c = result.cards[slot.cardId];
            return c && c.kind === "verdict" ? [c.verdict] : [];
          });
          expect(verdicts.sort()).toEqual([false, true]);
        } else if (shape === "stepper-sum") {
          // R9–R11 invariant: hand is COMPLETELY empty (the kid taps
          // the stepper card, never drags). The equation has 3 locked
          // operandSlots with NumberCards, AND the stepper card's
          // value is within [0, target + 3] (the dealer's "near the
          // answer" range, clamped at zero) — never the true answer
          // (the kid always has at least one tap to make).
          for (const slot of result.hand) {
            expect(slot.cardId).toBeNull();
          }
          const [aSlot, bSlot, sSlot] = result.round.equation.operandSlots;
          if (!aSlot || !bSlot || !sSlot) {
            throw new Error("stepper-sum: expected 3 operandSlots");
          }
          const aCard = aSlot.cardId ? result.cards[aSlot.cardId] : undefined;
          const bCard = bSlot.cardId ? result.cards[bSlot.cardId] : undefined;
          const sCard = sSlot.cardId ? result.cards[sSlot.cardId] : undefined;
          if (
            !aCard ||
            !bCard ||
            !sCard ||
            aCard.kind !== "number" ||
            bCard.kind !== "number" ||
            sCard.kind !== "number"
          ) {
            throw new Error("stepper-sum: expected 3 NumberCards in operandSlots");
          }
          const op = result.round.equation.operator;
          const real = op === "subtract" ? aCard.value - bCard.value : aCard.value + bCard.value;
          expect(real).toBeGreaterThanOrEqual(1);
          expect(real).toBeLessThanOrEqual(level.target);
          expect(sCard.value).toBeGreaterThanOrEqual(0);
          expect(sCard.value).toBeLessThanOrEqual(level.target + 3);
          expect(sCard.value).not.toBe(real); // dealer guarantees ≠
        } else if (shape === "find-missing-factor" || shape === "find-leading-factor") {
          assertFactorStepperShape(result, level, shape);
        } else if (shape === "find-product") {
          assertFindProductShape(result, level);
        } else if (shape === "chant-row" || shape === "rooftop-grid") {
          // R16 shapes have a placeholder equation (one empty operand
          // slot) and an empty hand — the kid never drags or selects
          // a card here. Damage accrues via R16-specific route
          // handlers (handleChantStepMastered / handleRooftopCellTap),
          // not via the dealer / evaluator. Just confirm the
          // structural placeholder + the enemy is seeded.
          for (const slot of result.hand) {
            expect(slot.cardId).toBeNull();
          }
          expect(result.round.equation.operandSlots).toHaveLength(1);
          expect(result.round.equation.operandSlots[0]?.cardId).toBeNull();
          expect(result.round.enemy?.templateId).toBe(level.enemyId);
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
      expect(numberCardValue(result.cards[staticCardId])).toBe(1);
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
      expect(numberCardValue(result.cards[staticCardId])).toBe(2);
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
      expect(numberCardValue(result.cards[s0.cardId])).toBe(6);
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

  test("R7/R8 hand cards are all capped at 1..20 across many seeds", () => {
    // R7/R8 mirror R5/R6 but raise the cap to 20. Same sweep guarantees
    // the guaranteed pair AND fillers stay in [1, 20] — a regression
    // would surface a 21-card or a 0-card the kid can't possibly use.
    for (let levelIndex = 34; levelIndex <= 43; levelIndex++) {
      for (let seed = 1; seed <= 30; seed++) {
        const result = dealRound({ levelIndex, random: seededRandom(seed) });
        for (const value of handValues(result)) {
          expect(value).toBeGreaterThanOrEqual(1);
          expect(value).toBeLessThanOrEqual(20);
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
