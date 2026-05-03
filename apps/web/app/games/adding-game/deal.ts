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
// Contract:
//   - Hand has exactly HAND_SIZE cards.
//   - At least one (a, b) pair in hand satisfies the level's equation:
//       add:      a + b === target
//       subtract: a − b === target  (a > b implied since target > 0)
//   - All card ids in the returned catalog are unique.
//   - Equation has 2 operand slots (both empty) and a target card with the
//     level's `target` value.
//   - Enemy is seeded from the level's enemyId at the registry's maxHp.
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

  // Guaranteed pair satisfying the level's equation. Caller has already
  // validated that the level config supports a valid pair via levels.ts.
  const [a, b] = pickGuaranteedPair(level, pickInt);

  // Fillers — extra cards from the same range. Some may incidentally form
  // additional valid pairs; that's acceptable per spec ("two fives or…").
  const fillers: number[] = [];
  for (let i = 0; i < HAND_SIZE - 2; i++) {
    fillers.push(pickInt(level.handValueRange.min, level.handValueRange.max));
  }

  const values = shuffle([a, b, ...fillers], random);

  const cards: CardCatalog = {};
  const hand: HandSlot[] = [];
  for (let i = 0; i < HAND_SIZE; i++) {
    const value = values[i];
    if (value === undefined) throw new Error("dealRound: hand index out of range");
    const cardId = `card:r${levelIndex}:t${Date.now()}:h${i}`;
    const card: Card = { id: cardId, value };
    cards[cardId] = card;
    hand.push({ id: `hand:${i}`, cardId });
  }

  // Target card — pre-dealt into the equation, not draggable.
  const targetCardId = `card:r${levelIndex}:t${Date.now()}:target`;
  const targetCard: Card = { id: targetCardId, value: level.target };
  cards[targetCardId] = targetCard;

  const equation: Equation = {
    operandSlots: [
      { id: "eq:0", cardId: null },
      { id: "eq:1", cardId: null },
    ],
    operator: level.operator,
    comparator: level.comparator,
    target: targetCard,
  };

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
  // matching is the steady state the player sees.
  const round: Round = {
    index: levelIndex,
    phase: "matching",
    equation,
    outcome: null,
    enemy,
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

function fail(level: LevelConfig): Error {
  return new Error(
    `levels: cannot generate guaranteed pair for level ${level.index} ` +
      `(${level.operator}/${level.comparator}, target=${level.target}, ` +
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
