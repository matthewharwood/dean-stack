import {
  type AddingGameState,
  type CardCatalog,
  type Equation,
  HAND_SIZE,
  type HandSlot,
  isNumberCard,
  type NumberCard,
  type Round,
  type RoundEnemy,
  type VerdictCard,
} from "@dean-stack/schemas";

import { ENEMY_REGISTRY } from "./enemies";
import { findLevel, type LevelConfig } from "./levels";

// Pure dealing logic. The route's gameStart effect and the post-win advance
// both call this to compute the next round; the result is then merged into
// the IDB-backed addingGameAtom.
//
// Two equation shapes — chosen by `level.equationShape`:
//
//   "find-sum" (default, R1–R4):
//     Hand has exactly HAND_SIZE cards, all unlocked.
//     At least one (a, b) pair in hand satisfies the level's equation:
//       add:      a + b === target   (eq) / a + b > target (gt) / a + b < target (lt)
//       subtract: a − b === target  (and similar for gt/lt; a > b implied for eq)
//     Equation has 2 operand slots (both empty, both unlocked) and a target
//     card with the level's `target` value.
//
//   "find-missing-result" (R5–R6):
//     Hand has HAND_SIZE cards. Exactly two of them are guaranteed to satisfy
//     the equation: pick `a` from the hand range, compute `b = static OP a`
//     (or `a OP static = b` per `staticOperand.position`); plant `a` and `b`
//     so the kid has a valid pair available. The static itself does NOT
//     consume a hand slot — it lives in the equation's locked operand slot.
//     Equation has THREE operand slots: [LHS-1, LHS-2, result]. One of
//     LHS-1/LHS-2 is locked + pre-filled with the static card; the other
//     LHS slot AND the result slot are empty + unlocked. `target` on the
//     equation is null (the kid produces the RHS).
//
// All card ids in the returned catalog are unique; enemy is seeded from
// the level's enemyId at the level's hp.
//
// `random` is injected so unit tests can run with a seeded source. Production
// uses `Math.random`.

export type DealtRound = {
  round: Round;
  cards: CardCatalog;
  hand: HandSlot[];
};

export type DealOptions = {
  levelIndex: number;
  random?: () => number;
};

export function dealRound({ levelIndex, random = Math.random }: DealOptions): DealtRound {
  const level = findLevel(levelIndex);
  if (!level) throw new Error(`dealRound: no level config for index ${levelIndex}`);

  const pickInt = (min: number, max: number): number =>
    Math.floor(random() * (max - min + 1)) + min;

  const shape = level.equationShape ?? "find-sum";
  const tStamp = Date.now();

  // R9–R11 short-circuit: stepper-sum has NO hand (kid never drags) and
  // a pre-filled locked equation with a kid-mutated stepper card.
  if (shape === "stepper-sum") {
    return dealStepperSumRound(level, levelIndex, tStamp, pickInt, random);
  }

  // R12 short-circuit: true-false-multiply has its own hand (T+F cards
  // only) and a pre-filled locked equation. Return early; the find-sum
  // / find-missing-result hand-dealer below doesn't apply.
  if (shape === "true-false-multiply") {
    return dealTrueFalseMultiplyRound(level, levelIndex, tStamp, pickInt, random);
  }

  // R13 short-circuit: find-missing-factor has no hand (kid only steps
  // the middle card) and a pre-filled locked equation. Return early.
  if (shape === "find-missing-factor") {
    return dealFindMissingFactorRound(level, levelIndex, tStamp, pickInt, random);
  }

  // R14 short-circuit: find-leading-factor mirrors R13 with the stepper
  // at slot 0 (left factor) instead of slot 1.
  if (shape === "find-leading-factor") {
    return dealFindLeadingFactorRound(level, levelIndex, tStamp, pickInt, random);
  }

  // R15 short-circuit: find-product (multi-choice). Shows both factors
  // locked, kid taps one of 5 candidate cards to commit the product.
  // No stepper — see dealFindProductRound for distractor strategy.
  if (shape === "find-product") {
    return dealFindProductRound(level, levelIndex, tStamp, pickInt, random);
  }

  // R16 short-circuits: chant-row (L1..L11) and rooftop-grid (L12).
  // Both shapes are minimal data-wise — no factor cards, no choice
  // grids dealt here. The route picks the right MP3 by reading
  // `level.target` (the multiplier 0..10 for chant-row, or the
  // capstone prompt count for rooftop-grid) and drives playback +
  // tap accounting through new R16-specific reducers, not through
  // the cards catalog.
  if (shape === "chant-row" || shape === "rooftop-grid") {
    return dealChantRound(level, levelIndex, shape);
  }

  // Common: the 5-card player hand. Both number-card shapes plant a
  // guaranteed pair — for find-sum it's (a, b) such that the equation
  // holds; for find-missing-result it's (a, b = static OP a) so the kid
  // can pick both the operand and the result from their hand.
  const guaranteed =
    shape === "find-missing-result"
      ? pickGuaranteedMissingResultPair(level, pickInt)
      : pickGuaranteedPair(level, pickInt);

  const fillers: number[] = [];
  for (let i = 0; i < HAND_SIZE - 2; i++) {
    fillers.push(pickInt(level.handValueRange.min, level.handValueRange.max));
  }
  const values = shuffle([guaranteed[0], guaranteed[1], ...fillers], random);

  const cards: CardCatalog = {};
  const hand: HandSlot[] = [];
  for (let i = 0; i < HAND_SIZE; i++) {
    const value = values[i];
    if (value === undefined) throw new Error("dealRound: hand index out of range");
    const cardId = `card:r${levelIndex}:t${tStamp}:h${i}`;
    const card: NumberCard = { id: cardId, kind: "number", value };
    cards[cardId] = card;
    hand.push({ id: `hand:${i}`, cardId });
  }

  let equation: Equation;
  if (shape === "find-missing-result") {
    if (!level.staticOperand) {
      throw new Error(
        `dealRound: level ${levelIndex} is find-missing-result but has no staticOperand`,
      );
    }
    // Static lives as a real card in the catalog so evaluate.ts reads it
    // through the same `cards[slot.cardId]?.value` path as everything else.
    // The slot gets `locked: true` so drag.tsx and applySwap refuse to
    // move it.
    const staticCardId = `card:r${levelIndex}:t${tStamp}:static`;
    const staticCard: NumberCard = {
      id: staticCardId,
      kind: "number",
      value: level.staticOperand.value,
    };
    cards[staticCardId] = staticCard;

    const staticAtFirst = level.staticOperand.position === "first";
    equation = {
      shape: "find-missing-result",
      operandSlots: [
        // LHS-1
        staticAtFirst
          ? { id: "eq:0", cardId: staticCardId, locked: true }
          : { id: "eq:0", cardId: null, locked: false },
        // LHS-2
        staticAtFirst
          ? { id: "eq:1", cardId: null, locked: false }
          : { id: "eq:1", cardId: staticCardId, locked: true },
        // RHS — the kid's result slot, always empty and unlocked at deal time.
        { id: "eq:result", cardId: null, locked: false },
      ],
      operator: level.operator,
      comparator: level.comparator,
      target: null,
      verdictSlot: null,
      choices: [],
    };
  } else {
    // find-sum (R1–R4): RHS is the displayed target card.
    const targetCardId = `card:r${levelIndex}:t${tStamp}:target`;
    const targetCard: NumberCard = { id: targetCardId, kind: "number", value: level.target };
    cards[targetCardId] = targetCard;
    equation = {
      shape: "find-sum",
      operandSlots: [
        { id: "eq:0", cardId: null, locked: false },
        { id: "eq:1", cardId: null, locked: false },
      ],
      operator: level.operator,
      comparator: level.comparator,
      target: targetCard,
      verdictSlot: null,
      choices: [],
    };
  }

  // Enemy template lookup — mismatched id between LEVELS and ENEMY_REGISTRY
  // is a hard error at boot rather than a silent null-enemy avatar.
  const template = ENEMY_REGISTRY.find((e) => e.id === level.enemyId);
  if (!template) {
    throw new Error(`dealRound: level ${levelIndex} references missing enemy ${level.enemyId}`);
  }
  // HP comes from the LEVEL config, not the template — the same enemy
  // returns across rounds at different difficulty (Tide Minnow has 6 HP
  // in round 1, 14 in round 3). The template's `maxHp` is a baseline
  // for stories / fallback only.
  const enemy: RoundEnemy = { templateId: template.id, hp: level.hp };

  // Phase: matching. Dealing is a logical step that completes here — the visual
  // dealing animation will land us in matching when it's built. For now,
  // matching is the steady state the player sees. wrongAttempts starts at 0
  // — every fresh deal resets the per-stage mistakes counter.
  const round: Round = {
    index: levelIndex,
    phase: "matching",
    equation,
    outcome: null,
    enemy,
    wrongAttempts: 0,
  };

  return { round, cards, hand };
}

// Generate a pair (a, b) such that `a op b cmp target` is satisfied, both
// values inside `handValueRange`. Throws when the level config has no
// solution under the constraints — caught by levels-coverage tests so a
// broken config crashes at startup, not silently in production.
function pickGuaranteedPair(
  level: LevelConfig,
  pickInt: (min: number, max: number) => number,
): [number, number] {
  const { operator, comparator, target, handValueRange } = level;
  const { min, max } = handValueRange;

  // ── ADD ─────────────────────────────────────────────────────────────
  if (operator === "add") {
    if (comparator === "eq") {
      // a + b = target, both in [min, max].
      const aMin = Math.max(min, target - max);
      const aMax = Math.min(max, target - min);
      if (aMax < aMin) throw fail(level);
      const a = pickInt(aMin, aMax);
      return [a, target - a];
    }
    if (comparator === "gt") {
      // a + b > target. Pick a near max, then b high enough to clear.
      // Need (a + b) > target with both ≤ max → a + max > target → a > target - max.
      // And a ≥ min, b ≥ min, so a + min ≤ a + b ≤ a + max.
      const aMin = Math.max(min, target - max + 1);
      if (aMin > max) throw fail(level);
      const a = pickInt(aMin, max);
      const bMin = Math.max(min, target - a + 1);
      if (bMin > max) throw fail(level);
      const b = pickInt(bMin, max);
      return [a, b];
    }
    if (comparator === "lt") {
      // a + b < target. Pick small. a ∈ [min, target - min - 1].
      const aMax = Math.min(max, target - min - 1);
      if (aMax < min) throw fail(level);
      const a = pickInt(min, aMax);
      const bMax = Math.min(max, target - a - 1);
      if (bMax < min) throw fail(level);
      const b = pickInt(min, bMax);
      return [a, b];
    }
  }

  // ── SUBTRACT ─────────────────────────────────────────────────────────
  if (operator === "subtract") {
    if (comparator === "eq") {
      // a - b = target, both in [min, max], implies a ≥ b + target.
      const bMin = min;
      const bMax = max - target;
      if (bMax < bMin) throw fail(level);
      const b = pickInt(bMin, bMax);
      return [b + target, b];
    }
    if (comparator === "gt") {
      // a - b > target → a > b + target. a ∈ [b + target + 1, max].
      const bMax = max - target - 1;
      if (bMax < min) throw fail(level);
      const b = pickInt(min, bMax);
      const aMin = b + target + 1;
      if (aMin > max) throw fail(level);
      const a = pickInt(aMin, max);
      return [a, b];
    }
    if (comparator === "lt") {
      // a - b < target. Easiest: a ≤ b (gives non-positive computed),
      // which is always less than a positive target. Pick a ∈ [min, max],
      // b ∈ [a, max] so b ≥ a → a - b ≤ 0 < target.
      const a = pickInt(min, max);
      const b = pickInt(a, max);
      return [a, b];
    }
  }

  throw new Error(
    `levels: unsupported operator/comparator (${operator}/${comparator}) for level ${level.index}`,
  );
}

// Pair-picker for find-missing-result levels. We need:
//   - a player operand `a` in handValueRange (the kid drags this into the
//     unlocked LHS slot).
//   - a player result `b` ALSO in handValueRange (the kid drags this into
//     the result slot).
//   - both satisfying `static OP a == b` (position "first")
//     OR `a OP static == b` (position "second").
//
// For add: b = static + a (first) OR a + static (second) → same value.
// For subtract / position "first": b = static - a → need a in
//   [max(min, static - max), min(max, static - min)] so b ∈ [min, max].
// For subtract / position "second": b = a - static → need a ≥ static AND
//   a ≤ static + max so b ∈ [min, max]. Levels deliberately keep
//   subtraction at position "first" (see levels.ts comment); we handle
//   the "second" branch defensively in case future level data flips.
function pickGuaranteedMissingResultPair(
  level: LevelConfig,
  pickInt: (min: number, max: number) => number,
): [number, number] {
  const cfg = level.staticOperand;
  if (!cfg) throw failMissing(level);
  const { operator } = level;
  const { min, max } = level.handValueRange;
  const k = cfg.value;

  if (operator === "add") {
    // Both positions yield b = k + a. Need a ∈ [min, max] AND b ∈ [min, max].
    const aMin = Math.max(min, min - k);
    const aMax = Math.min(max, max - k);
    if (aMax < aMin) throw failMissing(level);
    const a = pickInt(aMin, aMax);
    return [a, a + k];
  }

  if (operator === "subtract") {
    if (cfg.position === "first") {
      // b = k - a. Need a ∈ [min, max] AND b ∈ [min, max] → a ∈ [k-max, k-min].
      const aMin = Math.max(min, k - max);
      const aMax = Math.min(max, k - min);
      if (aMax < aMin) throw failMissing(level);
      const a = pickInt(aMin, aMax);
      return [a, k - a];
    }
    // position "second": b = a - k. Need a ∈ [min, max] AND b ∈ [min, max] →
    // a ∈ [max(min, k+min), min(max, k+max)] = [max(min, k+min), max].
    const aMin = Math.max(min, k + min);
    const aMax = Math.min(max, k + max);
    if (aMax < aMin) throw failMissing(level);
    const a = pickInt(aMin, aMax);
    return [a, a - k];
  }

  throw new Error(
    `levels: unsupported find-missing-result operator (${operator}) for level ${level.index}`,
  );
}

function fail(level: LevelConfig): Error {
  return new Error(
    `levels: cannot generate guaranteed pair for level ${level.index} ` +
      `(${level.operator}/${level.comparator}, target=${level.target}, ` +
      `range=[${level.handValueRange.min},${level.handValueRange.max}])`,
  );
}

function failMissing(level: LevelConfig): Error {
  return new Error(
    `levels: cannot generate find-missing-result pair for level ${level.index} ` +
      `(${level.operator}, static=${level.staticOperand?.value}, ` +
      `position=${level.staticOperand?.position}, ` +
      `range=[${level.handValueRange.min},${level.handValueRange.max}])`,
  );
}

function shuffle<T>(arr: readonly T[], random: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = a[i];
    const swap = a[j];
    if (tmp === undefined || swap === undefined) continue;
    a[i] = swap;
    a[j] = tmp;
  }
  return a;
}

// R9 dealer — true-false-multiply.
//
// Layout produced:
//   hand: [True, False, empty, empty, empty] — verdict cards in slots 0–1,
//   the remaining 3 slots stay empty (the kid only needs T or F).
//   equation: operandSlots = [a, b, c] ALL locked + pre-filled with
//   NumberCards (a × b is the real product; c is what the equation
//   CLAIMS the product is — sometimes true, sometimes off by ±1).
//   verdictSlot: a single droppable equation slot the kid lands T or F on.
//   target: null — the claimed product is in operandSlots[2].
//
// Factor scope: `level.handValueRange` doubles as the factor range for
// R9 (1..3 today). The level's `target` is the per-turn damage on a win.
// `comparator` is meaningless here and is always "eq" in the level data;
// the evaluator ignores it for this shape.
//
// True/false ratio: ~50/50 via a coin flip. False answers are off by
// exactly ±1 (the user-locked design choice); the helper clamps to c ≥ 1
// so we never claim "3 × 1 = 0" (zero products are visually weird for a
// first-time-multiplying kid).
function dealTrueFalseMultiplyRound(
  level: LevelConfig,
  levelIndex: number,
  tStamp: number,
  pickInt: (min: number, max: number) => number,
  random: () => number,
): DealtRound {
  const { min, max } = level.handValueRange;
  const a = pickInt(min, max);
  const b = pickInt(min, max);
  const realProduct = a * b;
  const isTrue = random() < 0.5;
  const c = isTrue ? realProduct : distractorProduct(realProduct, random);

  const cards: CardCatalog = {};

  // Locked LHS / RHS number cards. Stored in the catalog the same way as
  // R5/R6 statics so the evaluator + renderer resolve them through the
  // same `cards[slot.cardId]` path.
  const aId = `card:r${levelIndex}:t${tStamp}:a`;
  const bId = `card:r${levelIndex}:t${tStamp}:b`;
  const cId = `card:r${levelIndex}:t${tStamp}:c`;
  cards[aId] = { id: aId, kind: "number", value: a };
  cards[bId] = { id: bId, kind: "number", value: b };
  cards[cId] = { id: cId, kind: "number", value: c };

  // Verdict cards. Fixed ids — re-dealing a round always produces the
  // same T/F card ids per level, but since rounds clean up cards between
  // deals the catalog stays small.
  const trueId = `card:r${levelIndex}:t${tStamp}:true`;
  const falseId = `card:r${levelIndex}:t${tStamp}:false`;
  const trueCard: VerdictCard = { id: trueId, kind: "verdict", verdict: true };
  const falseCard: VerdictCard = { id: falseId, kind: "verdict", verdict: false };
  cards[trueId] = trueCard;
  cards[falseId] = falseCard;

  // Hand: T at slot 0, F at slot 1, 2–4 empty. Keeping the kid's
  // verdict cards in fixed positions is the simplest mental model — no
  // value beyond visual constancy, since both cards lead to the same
  // verdict-slot regardless of which hand position they sat in.
  const hand: HandSlot[] = [];
  for (let i = 0; i < HAND_SIZE; i++) {
    if (i === 0) hand.push({ id: `hand:${i}`, cardId: trueId });
    else if (i === 1) hand.push({ id: `hand:${i}`, cardId: falseId });
    else hand.push({ id: `hand:${i}`, cardId: null });
  }

  const equation: Equation = {
    shape: "true-false-multiply",
    operator: "multiply",
    comparator: "eq",
    operandSlots: [
      { id: "eq:a", cardId: aId, locked: true },
      { id: "eq:b", cardId: bId, locked: true },
      { id: "eq:c", cardId: cId, locked: true },
    ],
    target: null,
    verdictSlot: { id: "eq:verdict", cardId: null, locked: false },
    choices: [],
  };

  const template = ENEMY_REGISTRY.find((e) => e.id === level.enemyId);
  if (!template) {
    throw new Error(`dealRound: level ${levelIndex} references missing enemy ${level.enemyId}`);
  }
  const enemy: RoundEnemy = { templateId: template.id, hp: level.hp };

  const round: Round = {
    index: levelIndex,
    phase: "matching",
    equation,
    outcome: null,
    enemy,
    wrongAttempts: 0,
  };
  return { round, cards, hand };
}

// Pick a distractor product that's exactly 1 off from the real value.
// Random sign, with two clamps:
//   - never produce c = 0 (a kid reading "3 × 1 = 0" has no concrete
//     way to count it); forces the +1 branch when real === 1.
//   - never produce c > 10 (the dot array we render beneath has to fit
//     a single 2×5 ten-frame). Factors max 3 → real max 9 → +1 max 10,
//     which is fine; clamp is defensive.
function distractorProduct(real: number, random: () => number): number {
  const wantsMinus = random() < 0.5;
  if (real <= 1) return real + 1;
  if (real >= 10) return real - 1;
  return wantsMinus ? real - 1 : real + 1;
}

// R9–R11 dealer — stepper-sum.
//
// Layout produced:
//   hand: 5 empty slots — the kid never drags in this mode.
//   equation: operandSlots = [a, b, stepper], ALL locked + pre-filled.
//     a and b are dealer-chosen number cards within `handValueRange`
//     and constrained so `a OP b` lands in `[1, level.target]`.
//     `stepper` is a NumberCard whose value starts at a random offset
//     ±1–3 from the true answer (clamped to ≥ 0). The kid bumps it up
//     or down via the top/bottom halves of the card.
//   verdictSlot: null.
//
// Operator: `level.operator`. R11 uses a separate mix branch (50/50
// add/subtract per round). For mix, the dealer flips a coin per round
// — the level config still declares an operator (we pick `"add"` as
// the placeholder default for the mix level), but the dealer overrides
// it. To express that cleanly the level config gains a `mixedOperator`
// flag we read here.
//
// Damage on win = stepper.value, same reward shape as find-missing-
// result — bigger answers hit harder so the kid is incentivized to
// land precisely.
function dealStepperSumRound(
  level: LevelConfig,
  levelIndex: number,
  tStamp: number,
  pickInt: (min: number, max: number) => number,
  random: () => number,
): DealtRound {
  // R11 mix: coin-flip the operator per round. R9/R10 use the level's
  // declared operator unchanged.
  const operator = pickStepperOperator(level, random);

  const [a, b, realAnswer] = pickStepperAB(level, operator, pickInt);
  const startValue = pickStepperStart(realAnswer, level.target, random, pickInt);

  const cards: CardCatalog = {};
  const aId = `card:r${levelIndex}:t${tStamp}:a`;
  const bId = `card:r${levelIndex}:t${tStamp}:b`;
  const stepperId = `card:r${levelIndex}:t${tStamp}:stepper`;
  cards[aId] = { id: aId, kind: "number", value: a };
  cards[bId] = { id: bId, kind: "number", value: b };
  cards[stepperId] = { id: stepperId, kind: "number", value: startValue };

  // Empty hand — kid has no cards to drag in stepper rounds.
  const hand: HandSlot[] = Array.from({ length: HAND_SIZE }, (_, i) => ({
    id: `hand:${i}`,
    cardId: null,
  }));

  const equation: Equation = {
    shape: "stepper-sum",
    operator,
    comparator: "eq",
    operandSlots: [
      { id: "eq:a", cardId: aId, locked: true },
      { id: "eq:b", cardId: bId, locked: true },
      { id: "eq:stepper", cardId: stepperId, locked: true },
    ],
    target: null,
    verdictSlot: null,
    choices: [],
  };

  const template = ENEMY_REGISTRY.find((e) => e.id === level.enemyId);
  if (!template) {
    throw new Error(`dealRound: level ${levelIndex} references missing enemy ${level.enemyId}`);
  }
  const enemy: RoundEnemy = { templateId: template.id, hp: level.hp };

  const round: Round = {
    index: levelIndex,
    phase: "matching",
    equation,
    outcome: null,
    enemy,
    wrongAttempts: 0,
  };
  return { round, cards, hand };
}

// Pick (a, b, a OP b) for a stepper round. Constraints:
//   - a, b ∈ level.handValueRange
//   - real answer ∈ [1, level.target]
// Throws when no valid pair exists (covered by levels-coverage test).
function pickStepperAB(
  level: LevelConfig,
  operator: "add" | "subtract" | "multiply" | "divide",
  pickInt: (min: number, max: number) => number,
): [number, number, number] {
  const { min, max } = level.handValueRange;
  const target = level.target;
  if (operator === "add") {
    // a + b in [1, target], both in [min, max].
    const aMin = Math.max(min, 1 - max);
    const aMax = Math.min(max, target - min);
    if (aMax < aMin) throw failStepper(level);
    const a = pickInt(aMin, aMax);
    const bMin = Math.max(min, 1 - a);
    const bMax = Math.min(max, target - a);
    if (bMax < bMin) throw failStepper(level);
    const b = pickInt(bMin, bMax);
    return [a, b, a + b];
  }
  if (operator === "subtract") {
    // a - b in [1, target], both in [min, max], so a > b.
    const aMin = Math.max(min + 1, 1 + min);
    const aMax = max;
    if (aMax < aMin) throw failStepper(level);
    const a = pickInt(aMin, aMax);
    const bMin = Math.max(min, a - target);
    const bMax = Math.min(max, a - 1);
    if (bMax < bMin) throw failStepper(level);
    const b = pickInt(bMin, bMax);
    return [a, b, a - b];
  }
  throw new Error(
    `dealStepperSumRound: unsupported operator (${operator}) for level ${level.index}`,
  );
}

// Pick a start value for the stepper card. ±1–3 from the true answer,
// random sign, but NEVER equal to the answer (so the kid always has to
// move it), NEVER below 0, and NEVER above max+3 (kid won't have to
// step down forever). When the true answer is ≤ 0 (shouldn't happen
// for stepper-sum) we fall back to 0.
function pickStepperStart(
  real: number,
  max: number,
  random: () => number,
  pickInt: (min: number, max: number) => number,
): number {
  if (real <= 0) return 0;
  const lowMin = Math.max(0, real - 3);
  const lowMax = Math.max(0, real - 1);
  const highMin = real + 1;
  const highMax = Math.min(max + 3, real + 3);
  const canGoLow = lowMax >= lowMin;
  const canGoHigh = highMax >= highMin;
  // 50/50 high vs low when both are available; fall through when one
  // side is empty (e.g., real === 1 → low side is empty, must go high).
  const goHigh = canGoHigh && (!canGoLow || random() < 0.5);
  if (goHigh) return pickInt(highMin, highMax);
  if (canGoLow) return pickInt(lowMin, lowMax);
  return 0;
}

// Hoisted to dodge sonarjs's nested-ternary rule on the call site.
// R11 mix flips a coin per round; R9 / R10 honor the level's declared
// operator.
function pickStepperOperator(
  level: LevelConfig,
  random: () => number,
): "add" | "subtract" | "multiply" | "divide" {
  if (!level.mixedOperator) return level.operator;
  return random() < 0.5 ? "add" : "subtract";
}

function failStepper(level: LevelConfig): Error {
  return new Error(
    `dealStepperSumRound: cannot generate (a, b) for level ${level.index} ` +
      `(${level.operator}, target=${level.target}, ` +
      `range=[${level.handValueRange.min},${level.handValueRange.max}])`,
  );
}

// R13 dealer — find-missing-factor.
//
// Layout produced:
//   hand: 5 empty slots — the kid never drags in this mode.
//   equation: operandSlots = [a, stepper, c], ALL locked + pre-filled.
//     `a` is the shown factor, drawn from level.handValueRange. The
//     missing factor (true answer for `?`) is also drawn from
//     handValueRange so a × answer fits the kid's mental scope. `c`
//     is set to a × answer so the equation has exactly one solution
//     in [0, FACTOR_MAX]. The `stepper` card starts at a random
//     offset ±1..3 from `answer`, clamped to [0, FACTOR_MAX], never
//     equal to the answer (so the kid always has to move it).
//   verdictSlot: null.
//
// Operator: always "multiply". `comparator` is meaningless here and is
// "eq" in the level data; the evaluator ignores it for this shape.
//
// Damage on win = stepper.value (the kid's chosen factor). Mirrors the
// R9–R11 stepper-sum reward shape: solving the equation IS the damage.
// Bigger missing factors hit harder, which keeps the kid honest about
// landing precisely instead of bailing out on smaller answers.

// Hard upper bound for the stepper / factors in find-missing-factor.
// Mirrors the route's useGameStepper clamp; keep these in sync.
const FIND_MISSING_FACTOR_MAX = 10;

function dealFindMissingFactorRound(
  level: LevelConfig,
  levelIndex: number,
  tStamp: number,
  pickInt: (min: number, max: number) => number,
  random: () => number,
): DealtRound {
  const { min, max } = level.handValueRange;
  const a = pickInt(min, max);
  const answer = pickInt(min, max);
  const c = a * answer;
  const startValue = pickFactorStepperStart(answer, FIND_MISSING_FACTOR_MAX, random, pickInt);

  const cards: CardCatalog = {};
  const aId = `card:r${levelIndex}:t${tStamp}:a`;
  const stepperId = `card:r${levelIndex}:t${tStamp}:stepper`;
  const cId = `card:r${levelIndex}:t${tStamp}:c`;
  cards[aId] = { id: aId, kind: "number", value: a };
  cards[stepperId] = { id: stepperId, kind: "number", value: startValue };
  cards[cId] = { id: cId, kind: "number", value: c };

  // Empty hand — kid has no cards to drag.
  const hand: HandSlot[] = Array.from({ length: HAND_SIZE }, (_, i) => ({
    id: `hand:${i}`,
    cardId: null,
  }));

  const equation: Equation = {
    shape: "find-missing-factor",
    operator: "multiply",
    comparator: "eq",
    operandSlots: [
      { id: "eq:a", cardId: aId, locked: true },
      { id: "eq:stepper", cardId: stepperId, locked: true },
      { id: "eq:c", cardId: cId, locked: true },
    ],
    target: null,
    verdictSlot: null,
    choices: [],
  };

  const template = ENEMY_REGISTRY.find((e) => e.id === level.enemyId);
  if (!template) {
    throw new Error(`dealRound: level ${levelIndex} references missing enemy ${level.enemyId}`);
  }
  const enemy: RoundEnemy = { templateId: template.id, hp: level.hp };

  const round: Round = {
    index: levelIndex,
    phase: "matching",
    equation,
    outcome: null,
    enemy,
    wrongAttempts: 0,
  };
  return { round, cards, hand };
}

// Pick a start value for the find-missing-factor stepper card. Same
// "near but not equal to the answer" intent as `pickStepperStart`, but
// the stepper here clamps HARD at `max` (no +3 over-tap window — the
// stepper's value IS a factor, so going above the factor cap is
// nonsense). Distance from `answer` is 1..3 when room allows.
function pickFactorStepperStart(
  answer: number,
  max: number,
  random: () => number,
  pickInt: (min: number, max: number) => number,
): number {
  const lowMin = Math.max(0, answer - 3);
  const lowMax = answer - 1;
  const highMin = answer + 1;
  const highMax = Math.min(max, answer + 3);
  const canGoLow = lowMax >= lowMin && lowMax >= 0;
  const canGoHigh = highMax >= highMin;
  const goHigh = canGoHigh && (!canGoLow || random() < 0.5);
  if (goHigh) return pickInt(highMin, highMax);
  if (canGoLow) return pickInt(lowMin, lowMax);
  // Both sides empty only on degenerate input (max < 1 OR answer == 0
  // AND max == 0). LEVELS data forbids this; fall back to 0 defensively.
  return 0;
}

// R14 dealer — find-leading-factor.
//
// Layout produced:
//   hand: 5 empty slots — same as R13, no drag.
//   equation: operandSlots = [stepper, b, c], ALL locked.
//     `b` = the static second factor, drawn from level.handValueRange.
//     `answer` = the true leading factor, also drawn from
//                level.handValueRange. The kid is finding this.
//     `c` = answer × b (the locked product on the right).
//     `stepper` starts ±1..3 from `answer`, clamped to [0, 10].
//   verdictSlot: null.
//
// Reward / clamp identical to R13: damage = stepper.value, hard max 10.
// The ONLY difference is which slot the stepper occupies, which drives
// a different EquationView branch (kid reads `? × b = c` instead of
// `a × ? = c`).
function dealFindLeadingFactorRound(
  level: LevelConfig,
  levelIndex: number,
  tStamp: number,
  pickInt: (min: number, max: number) => number,
  random: () => number,
): DealtRound {
  const { min, max } = level.handValueRange;
  const b = pickInt(min, max);
  const answer = pickInt(min, max);
  const c = answer * b;
  const startValue = pickFactorStepperStart(answer, FIND_MISSING_FACTOR_MAX, random, pickInt);

  const cards: CardCatalog = {};
  const stepperId = `card:r${levelIndex}:t${tStamp}:stepper`;
  const bId = `card:r${levelIndex}:t${tStamp}:b`;
  const cId = `card:r${levelIndex}:t${tStamp}:c`;
  cards[stepperId] = { id: stepperId, kind: "number", value: startValue };
  cards[bId] = { id: bId, kind: "number", value: b };
  cards[cId] = { id: cId, kind: "number", value: c };

  const hand: HandSlot[] = Array.from({ length: HAND_SIZE }, (_, i) => ({
    id: `hand:${i}`,
    cardId: null,
  }));

  const equation: Equation = {
    shape: "find-leading-factor",
    operator: "multiply",
    comparator: "eq",
    operandSlots: [
      { id: "eq:stepper", cardId: stepperId, locked: true },
      { id: "eq:b", cardId: bId, locked: true },
      { id: "eq:c", cardId: cId, locked: true },
    ],
    target: null,
    verdictSlot: null,
    choices: [],
  };

  const template = ENEMY_REGISTRY.find((e) => e.id === level.enemyId);
  if (!template) {
    throw new Error(`dealRound: level ${levelIndex} references missing enemy ${level.enemyId}`);
  }
  const enemy: RoundEnemy = { templateId: template.id, hp: level.hp };

  const round: Round = {
    index: levelIndex,
    phase: "matching",
    equation,
    outcome: null,
    enemy,
    wrongAttempts: 0,
  };
  return { round, cards, hand };
}

// R15 dealer — find-product (multi-choice).
//
// Layout produced:
//   hand: 5 empty slots — kid never drags from the global hand here.
//   equation:
//     operandSlots[0] = a (locked NumberCard)
//     operandSlots[1] = b (locked NumberCard)
//     operandSlots[2] = answer slot — cardId null, locked false; the
//                       kid commits one of the `choices` cards into
//                       this slot by tapping it.
//     choices = 5 NumberCards: 1 correct product + 4 confusion-table
//               distractors (see pickDistractors). Ordered randomly
//               left-to-right so the correct slot index varies.
//   verdictSlot: null.
//
// Reward: damage = 1 per correct (level HP becomes "number of
// equations to solve" — see levels.ts). This breaks the prior cheat
// path where the stepper-version's gap-revealing hints let the kid
// incrementally walk to the answer: each pick here is a full commit,
// and a wrong pick re-deals the same a/b with FRESH distractors.
function dealFindProductRound(
  level: LevelConfig,
  levelIndex: number,
  tStamp: number,
  pickInt: (min: number, max: number) => number,
  random: () => number,
): DealtRound {
  const { min, max } = level.handValueRange;
  const a = pickInt(min, max);
  const b = pickInt(min, max);
  const answer = a * b;

  const cards: CardCatalog = {};
  const aId = `card:r${levelIndex}:t${tStamp}:a`;
  const bId = `card:r${levelIndex}:t${tStamp}:b`;
  cards[aId] = { id: aId, kind: "number", value: a };
  cards[bId] = { id: bId, kind: "number", value: b };

  // 1 correct + 4 distractors. tStamp keeps choice ids unique across
  // re-deals so React keys never collide.
  const distractors = pickProductDistractors(a, b, random);
  const correctChoice = answer;
  const choiceValues = shuffle([correctChoice, ...distractors], random);
  const choices = choiceValues.map((value, i) => {
    const id = `card:r${levelIndex}:t${tStamp}:choice:${i}`;
    const card: NumberCard = { id, kind: "number", value };
    cards[id] = card;
    return card;
  });

  const hand: HandSlot[] = Array.from({ length: HAND_SIZE }, (_, i) => ({
    id: `hand:${i}`,
    cardId: null,
  }));

  const equation: Equation = {
    shape: "find-product",
    operator: "multiply",
    comparator: "eq",
    operandSlots: [
      { id: "eq:a", cardId: aId, locked: true },
      { id: "eq:b", cardId: bId, locked: true },
      // The kid's answer slot. cardId fills when the kid taps a choice;
      // `locked: false` so the route can write into it via applySwap.
      { id: "eq:answer", cardId: null, locked: false },
    ],
    target: null,
    verdictSlot: null,
    choices,
  };

  const template = ENEMY_REGISTRY.find((e) => e.id === level.enemyId);
  if (!template) {
    throw new Error(`dealRound: level ${levelIndex} references missing enemy ${level.enemyId}`);
  }
  const enemy: RoundEnemy = { templateId: template.id, hp: level.hp };

  const round: Round = {
    index: levelIndex,
    phase: "matching",
    equation,
    outcome: null,
    enemy,
    wrongAttempts: 0,
  };
  return { round, cards, hand };
}

// Pick exactly 4 distractor products for the R15 multi-choice round.
//
// Confusion-table mix (per design discussion):
//   - up to 2 from the same-factor row (other multiples of `a`,
//     excluding `a*b` itself and excluding ±1/±2 of the answer)
//   - 1 from a neighbor row (other multiples of `b` ± 1, same exclusions)
//   - 1 wildcard plausible number in [1, 100] (same exclusions)
//
// All distractors are:
//   - integers in [1, 100]
//   - never equal to the correct answer
//   - never within ±1 or ±2 of the correct answer (defeats "almost"
//     inference where the kid sees a near-miss and infers the truth)
//   - distinct from one another (no duplicate cards)
//
// Falls back to wildcards if a category is exhausted, so the contract
// always returns exactly 4 distractors.
function pickProductDistractors(a: number, b: number, random: () => number): number[] {
  const answer = a * b;
  const forbidden = new Set<number>([answer, answer - 1, answer + 1, answer - 2, answer + 2]);
  const inRange = (n: number): boolean => n >= 1 && n <= 100;
  const candidates = (xs: number[]): number[] => xs.filter((n) => inRange(n) && !forbidden.has(n));

  // Same-factor row: a × 1..10 excluding a × b
  const sameRow = candidates(Array.from({ length: 10 }, (_, i) => a * (i + 1)));
  // Neighbor row: (b-1) and (b+1) multiplied by 1..10
  const neighborRow = candidates([
    ...Array.from({ length: 10 }, (_, i) => (b - 1) * (i + 1)),
    ...Array.from({ length: 10 }, (_, i) => (b + 1) * (i + 1)),
  ]);
  // Wildcards: every plausible value in [1, 100]
  const wildcards = candidates(Array.from({ length: 100 }, (_, i) => i + 1));

  const picked: number[] = [];
  const used = new Set<number>();
  const pickOne = (pool: number[]): boolean => {
    const fresh = pool.filter((n) => !used.has(n));
    if (fresh.length === 0) return false;
    const chosen = fresh[Math.floor(random() * fresh.length)];
    if (chosen === undefined) return false;
    picked.push(chosen);
    used.add(chosen);
    return true;
  };

  // Up to 2 from same-row, 1 from neighbor, 1 wildcard — pad with
  // wildcards if any earlier slot fails (small `a`/`b` can exhaust
  // sameRow quickly).
  pickOne(sameRow);
  pickOne(sameRow);
  pickOne(neighborRow);
  pickOne(wildcards);
  while (picked.length < 4 && pickOne(wildcards)) {
    // loop fills any missing slots with additional wildcards
  }
  return picked;
}

// R15 find-product helper. Called by the route's find-product tap
// handler on a WRONG pick. Builds a fresh distractor set for the same
// (a, b) the round was dealt with, clears the kid's wrong pick out of
// the answer slot, and leaves the wrongAttempts counter as-is. Result:
// the kid sees the choice row reshuffle without the equation itself
// changing — sweep-the-cards cheats become impossible because the
// candidate set turns over on every miss.
//
// Non-find-product states pass through unchanged so the helper stays
// safe to call from any caller path. If the equation already has no
// candidate cards (defensive — only happens on a malformed save), we
// also pass through.
export function redealFindProductDistractors(state: AddingGameState): AddingGameState {
  if (!state.round) return state;
  const eq = state.round.equation;
  if (eq.shape !== "find-product") return state;
  const aSlot = eq.operandSlots[0];
  const bSlot = eq.operandSlots[1];
  const answerSlot = eq.operandSlots[2];
  if (!aSlot?.cardId || !bSlot?.cardId || !answerSlot) return state;
  const aCard = state.cards[aSlot.cardId];
  const bCard = state.cards[bSlot.cardId];
  if (!aCard || !bCard || !isNumberCard(aCard) || !isNumberCard(bCard)) return state;
  const a = aCard.value;
  const b = bCard.value;
  const answer = a * b;

  // Strip the old choice cards from the catalog so they don't leak,
  // and clear the kid's wrong pick from the answer slot in the same
  // pass.
  const oldChoiceIds = new Set(eq.choices.map((c) => c.id));
  const survivingCards: CardCatalog = {};
  for (const [id, card] of Object.entries(state.cards)) {
    if (oldChoiceIds.has(id)) continue;
    if (id === answerSlot.cardId) continue;
    survivingCards[id] = card;
  }

  // Build fresh distractors + correct, in a new shuffled order. The
  // state.round non-null was just established by the early-return at
  // the top of the function; hoist into a local so the closure below
  // can read .index without re-asserting.
  const roundIndex = state.round.index;
  const tStamp = Date.now();
  const distractors = pickProductDistractors(a, b, Math.random);
  const choiceValues = shuffle([answer, ...distractors], Math.random);
  const newChoices = choiceValues.map((value, i) => {
    const id = `card:r${roundIndex}:t${tStamp}:choice:${i}`;
    const card: NumberCard = { id, kind: "number", value };
    survivingCards[id] = card;
    return card;
  });

  return {
    ...state,
    cards: survivingCards,
    round: {
      ...state.round,
      equation: {
        ...eq,
        operandSlots: eq.operandSlots.map((s) =>
          s.id === answerSlot.id ? { ...s, cardId: null } : s,
        ),
        choices: newChoices,
      },
    },
  };
}

// R16 dealer — chant-row (L1..L11) and rooftop-grid (L12).
//
// Minimal: no cards in the catalog, no hand cards (empty hand). The
// equation is a stub with one empty placeholder operand slot to
// satisfy EquationSchema's `.min(1)` constraint; the route reads
// `level.target` directly to pick the right chant MP3 (chant-row) or
// to drive the rooftop prompt sequence (rooftop-grid).
//
// All R16 row stages share the SAME Tower Keeper boss across the whole
// round; HP per LEVEL still resets on entry (one floor at a time), so
// the kid sees an HP bar that depletes within each row's chant and
// then re-fills to the next floor's max on advance.
function dealChantRound(
  level: LevelConfig,
  levelIndex: number,
  shape: "chant-row" | "rooftop-grid",
): DealtRound {
  const cards: CardCatalog = {};
  const hand: HandSlot[] = Array.from({ length: HAND_SIZE }, (_, i) => ({
    id: `hand:${i}`,
    cardId: null,
  }));

  const equation: Equation = {
    shape,
    operator: "multiply",
    comparator: "eq",
    operandSlots: [
      // Single placeholder slot. The route's EquationView for these
      // shapes ignores operandSlots entirely; the slot exists only to
      // satisfy the schema's `.min(1)` constraint without forcing us
      // to widen it.
      { id: "eq:placeholder", cardId: null, locked: false },
    ],
    target: null,
    verdictSlot: null,
    choices: [],
  };

  const template = ENEMY_REGISTRY.find((e) => e.id === level.enemyId);
  if (!template) {
    throw new Error(`dealRound: level ${levelIndex} references missing enemy ${level.enemyId}`);
  }
  const enemy: RoundEnemy = { templateId: template.id, hp: level.hp };

  const round: Round = {
    index: levelIndex,
    phase: "matching",
    equation,
    outcome: null,
    enemy,
    wrongAttempts: 0,
  };
  return { round, cards, hand };
}
