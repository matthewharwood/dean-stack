import type { Comparator, Operator } from "@dean-stack/schemas";

// Per-level configuration: which enemy you fight, what equation shape the
// dealer produces, what value range hand cards are drawn from, and how
// much HP the enemy has THIS round (since the same enemy returns across
// rounds with mounting HP). Damage = `target` value on a winning eval.
//
// FOUR ROUNDS structure (the kid's progression):
//   Round 1 — addition only, equality.   The "spirits" learning to count.
//   Round 2 — subtraction only, equality. The same six echoes, but now
//             the kid needs the inverse operation.
//   Round 3 — greater-than / less-than. Same six again, with inequality
//             reasoning — "land on this side of the wall."
//   Round 4 — five new echoes, mixed everything. Any operator, any
//             comparator. The trench has taught the kid; this is the
//             gauntlet.
export type LevelConfig = {
  index: number;
  enemyId: string;
  operator: Operator;
  comparator: Comparator;
  target: number;
  // HP for THIS encounter. Overrides EnemyTemplate.maxHp because the
  // same enemy returns at different difficulty across rounds; the
  // template's maxHp is a baseline for storybook / fallback.
  hp: number;
  // Inclusive [min, max]. Constrains the guaranteed pair AND the fillers.
  handValueRange: { min: number; max: number };
};

// 1-based level index = position in this array + 1.
//
// HP scaling: turns-per-enemy stays in 1–4 range so a kid doesn't grind.
// Easier rounds → fewer turns; later rounds → more.
export const LEVELS: readonly LevelConfig[] = [
  // ── ROUND 1 — addition only ─────────────────────────────────────────
  // Six echoes from common to mythic. All "_ + _ = target". Targets
  // grow gently. The wraith caps the round at 20.
  {
    index: 1,
    enemyId: "hadal-tide-minnow-echo",
    operator: "add",
    comparator: "eq",
    target: 6,
    hp: 6,
    handValueRange: { min: 1, max: 5 },
  },
  {
    index: 2,
    enemyId: "hadal-pressure-puff-echo",
    operator: "add",
    comparator: "eq",
    target: 10,
    hp: 20,
    handValueRange: { min: 1, max: 9 },
  },
  {
    index: 3,
    enemyId: "hadal-glow-polyp-echo",
    operator: "add",
    comparator: "eq",
    target: 12,
    hp: 12,
    handValueRange: { min: 1, max: 11 },
  },
  {
    index: 4,
    enemyId: "hadal-silt-crawler-echo",
    operator: "add",
    comparator: "eq",
    target: 15,
    hp: 30,
    handValueRange: { min: 1, max: 14 },
  },
  {
    index: 5,
    enemyId: "hadal-ember-snail-echo",
    operator: "add",
    comparator: "eq",
    target: 18,
    hp: 36,
    handValueRange: { min: 5, max: 13 },
  },
  {
    index: 6,
    enemyId: "hadal-pressure-wraith",
    operator: "add",
    comparator: "eq",
    target: 20,
    hp: 40,
    handValueRange: { min: 5, max: 15 },
  },
  // ── ROUND 2 — subtraction only ──────────────────────────────────────
  {
    index: 7,
    enemyId: "hadal-tide-minnow-echo",
    operator: "subtract",
    comparator: "eq",
    target: 3,
    hp: 6,
    handValueRange: { min: 1, max: 7 },
  },
  {
    index: 8,
    enemyId: "hadal-pressure-puff-echo",
    operator: "subtract",
    comparator: "eq",
    target: 5,
    hp: 15,
    handValueRange: { min: 1, max: 10 },
  },
  {
    index: 9,
    enemyId: "hadal-glow-polyp-echo",
    operator: "subtract",
    comparator: "eq",
    target: 6,
    hp: 12,
    handValueRange: { min: 1, max: 12 },
  },
  {
    index: 10,
    enemyId: "hadal-silt-crawler-echo",
    operator: "subtract",
    comparator: "eq",
    target: 8,
    hp: 24,
    handValueRange: { min: 1, max: 14 },
  },
  {
    index: 11,
    enemyId: "hadal-ember-snail-echo",
    operator: "subtract",
    comparator: "eq",
    target: 10,
    hp: 30,
    handValueRange: { min: 1, max: 16 },
  },
  {
    index: 12,
    enemyId: "hadal-pressure-wraith",
    operator: "subtract",
    comparator: "eq",
    target: 12,
    hp: 36,
    handValueRange: { min: 1, max: 18 },
  },
  // ── ROUND 3 — greater-than / less-than (mixed operator) ─────────────
  {
    index: 13,
    enemyId: "hadal-tide-minnow-echo",
    operator: "add",
    comparator: "gt",
    target: 7,
    hp: 14,
    handValueRange: { min: 1, max: 7 },
  },
  {
    index: 14,
    enemyId: "hadal-pressure-puff-echo",
    operator: "add",
    comparator: "lt",
    target: 9,
    hp: 18,
    handValueRange: { min: 1, max: 9 },
  },
  {
    index: 15,
    enemyId: "hadal-glow-polyp-echo",
    operator: "subtract",
    comparator: "gt",
    target: 4,
    hp: 12,
    handValueRange: { min: 1, max: 12 },
  },
  {
    index: 16,
    enemyId: "hadal-silt-crawler-echo",
    operator: "add",
    comparator: "gt",
    target: 14,
    hp: 28,
    handValueRange: { min: 1, max: 13 },
  },
  {
    index: 17,
    enemyId: "hadal-ember-snail-echo",
    operator: "subtract",
    comparator: "lt",
    target: 5,
    hp: 25,
    handValueRange: { min: 1, max: 15 },
  },
  {
    index: 18,
    enemyId: "hadal-pressure-wraith",
    operator: "add",
    comparator: "gt",
    target: 22,
    hp: 44,
    handValueRange: { min: 5, max: 17 },
  },
  // ── ROUND 4 — second half, mixed everything ────────────────────────
  // Five new echoes. Every level swaps operator and/or comparator;
  // there's no pattern to lean on. The kid's reasoning has to flex.
  {
    index: 19,
    enemyId: "hadal-glass-manta-echo",
    operator: "add",
    comparator: "lt",
    target: 8,
    hp: 16,
    handValueRange: { min: 1, max: 9 },
  },
  {
    index: 20,
    enemyId: "hadal-brine-needle-urchin-echo",
    operator: "subtract",
    comparator: "gt",
    target: 6,
    hp: 18,
    handValueRange: { min: 1, max: 13 },
  },
  {
    index: 21,
    enemyId: "hadal-basalt-lantern-leech-echo",
    operator: "add",
    comparator: "gt",
    target: 14,
    hp: 28,
    handValueRange: { min: 1, max: 13 },
  },
  {
    index: 22,
    enemyId: "hadal-sandglass-stalker-echo",
    operator: "subtract",
    comparator: "lt",
    target: 5,
    hp: 30,
    handValueRange: { min: 1, max: 12 },
  },
  {
    index: 23,
    enemyId: "hadal-kelp-censer-echo",
    operator: "add",
    comparator: "gt",
    target: 25,
    hp: 50,
    handValueRange: { min: 8, max: 22 },
  },
];

export const FINAL_LEVEL_INDEX: number = LEVELS.length;

// Round boundaries — the LAST level index of each round. Used by the
// route's round indicator and the celebration trigger.
export const ROUND_BOUNDARIES: readonly number[] = [6, 12, 18, 23];

export function findLevel(index: number): LevelConfig | undefined {
  return LEVELS.find((l) => l.index === index);
}

// Which round (1-indexed) does a given level belong to?
export function roundOf(levelIndex: number): 1 | 2 | 3 | 4 {
  if (levelIndex <= 6) return 1;
  if (levelIndex <= 12) return 2;
  if (levelIndex <= 18) return 3;
  return 4;
}

export function levelsInRound(round: 1 | 2 | 3 | 4): number {
  if (round === 1) return 6;
  if (round === 2) return 6;
  if (round === 3) return 6;
  return 5;
}

// Local level index within a round (1-based). Used by the indicator dots.
export function localLevelIndex(levelIndex: number): number {
  if (levelIndex <= 6) return levelIndex;
  if (levelIndex <= 12) return levelIndex - 6;
  if (levelIndex <= 18) return levelIndex - 12;
  return levelIndex - 18;
}

// Backwards-compatibility shims for callers that already imported the
// old tier helpers. Tier == round in the new model.
export const TIER_1_LAST_INDEX: number = 6;
export const tierOf = roundOf;
