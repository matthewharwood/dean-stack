import {
  type Card,
  type CardCatalog,
  type Equation,
  HAND_SIZE,
  type HandSlot,
  type Round,
  type RoundEnemy,
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

  // Common: the 5-card player hand. Both shapes plant a guaranteed pair —
  // for find-sum it's (a, b) such that the equation holds; for
  // find-missing-result it's (a, b = static OP a) so the kid can pick
  // both the operand and the result from their hand.
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
    const card: Card = { id: cardId, value };
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
    const staticCard: Card = { id: staticCardId, value: level.staticOperand.value };
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
    };
  } else {
    // find-sum (R1–R4): RHS is the displayed target card.
    const targetCardId = `card:r${levelIndex}:t${tStamp}:target`;
    const targetCard: Card = { id: targetCardId, value: level.target };
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
