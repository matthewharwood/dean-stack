import type { Comparator, EquationShape, Operator } from "@dean-stack/schemas";

// Per-level configuration: which enemy you fight, what equation shape the
// dealer produces, what value range hand cards are drawn from, and how
// much HP the enemy has THIS round (since the same enemy returns across
// rounds with mounting HP). Damage = `target` value on a winning eval
// for find-sum levels; for find-missing-result levels, damage = the kid's
// chosen result card.
//
// SIX ROUNDS structure (the kid's progression):
//   Round 1 — addition only, equality.   The "spirits" learning to count.
//   Round 2 — subtraction only, equality. The same six echoes, but now
//             the kid needs the inverse operation.
//   Round 3 — greater-than / less-than. Same six again, with inequality
//             reasoning — "land on this side of the wall."
//   Round 4 — five new echoes, mixed everything. Any operator, any
//             comparator. The trench has taught the kid; this is the
//             gauntlet's first run.
//   Round 5 — same five tier-2 echoes return. find-missing-result + add:
//             one operand is a static, the kid plays the other operand
//             AND the result. "Static + ? = ?" / "? + static = ?".
//             Encounter 2 → posters flip to the _L1 variant.
//   Round 6 — same five tier-2 echoes again. find-missing-result +
//             subtract. Encounter 3 → posters flip to the _L2 variant
//             (the cap). HP scales another notch.
//
// Round 5/6 fields:
//   - equationShape: "find-missing-result"
//   - staticOperand.position: "first" or "second" — which LHS slot is
//     pre-filled with the static (the OTHER LHS slot + the result slot
//     are kid-played).
//   - staticOperand.value: the static integer.
//   - target: still required by the schema; for find-missing-result it's
//     a baseline reference (highest plausible result for the level) used
//     to size the hand range and surface in storybook fallbacks. The
//     evaluator does NOT compare against it for this shape.
export type StaticOperandConfig = {
  position: "first" | "second";
  value: number;
};

export type LevelConfig = {
  index: number;
  enemyId: string;
  operator: Operator;
  comparator: Comparator;
  // Equation shape — controls dealer + evaluator semantics. Defaults to
  // "find-sum" via the dealer when omitted, so existing tier-1 entries
  // can stay terse.
  equationShape?: EquationShape;
  // Only meaningful when equationShape === "find-missing-result". The
  // dealer pre-fills the chosen operand position with this value and
  // marks the slot locked.
  staticOperand?: StaticOperandConfig;
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
  // ── ROUND 5 — find-missing-result + add ─────────────────────────────
  // The five tier-2 echoes return for their second encounter (poster
  // variant flips _L1). Equation shape: `static + ? = ?`. The kid plays
  // BOTH the operand and the result; both cards (and therefore every
  // card the kid touches in this round) come from a 1–5 hand range.
  // Static is constrained so static + a ≤ 5 always has a solution:
  //
  //   static=1 → a∈[1,4], b∈[2,5]   (easiest — 4 valid pairs)
  //   static=2 → a∈[1,3], b∈[3,5]
  //   static=3 → a∈[1,2], b∈[4,5]
  //   static=4 → a∈[1,1], b∈[5,5]   (tightest — only (1,5))
  //
  // The cognitive ramp comes from the SHAPE (kid plays 2 cards, mentally
  // computes the result) plus the gradually-tightening static — NOT from
  // big numbers. Position alternates "first" / "second" so the kid sees
  // both `K + a = b` and `a + K = b` framings.
  //
  // HP is calibrated against per-turn damage = the kid's chosen result
  // ∈ [1, 5]. ~2–4 turns per enemy keeps the difficulty honest without
  // grinding.
  {
    index: 24,
    enemyId: "hadal-glass-manta-echo",
    operator: "add",
    comparator: "eq",
    equationShape: "find-missing-result",
    staticOperand: { position: "first", value: 1 },
    target: 5,
    hp: 6,
    handValueRange: { min: 1, max: 5 },
  },
  {
    index: 25,
    enemyId: "hadal-brine-needle-urchin-echo",
    operator: "add",
    comparator: "eq",
    equationShape: "find-missing-result",
    staticOperand: { position: "second", value: 2 },
    target: 5,
    hp: 8,
    handValueRange: { min: 1, max: 5 },
  },
  {
    index: 26,
    enemyId: "hadal-basalt-lantern-leech-echo",
    operator: "add",
    comparator: "eq",
    equationShape: "find-missing-result",
    staticOperand: { position: "first", value: 3 },
    target: 5,
    hp: 10,
    handValueRange: { min: 1, max: 5 },
  },
  {
    index: 27,
    enemyId: "hadal-sandglass-stalker-echo",
    operator: "add",
    comparator: "eq",
    equationShape: "find-missing-result",
    staticOperand: { position: "second", value: 2 },
    target: 5,
    hp: 12,
    handValueRange: { min: 1, max: 5 },
  },
  {
    index: 28,
    enemyId: "hadal-kelp-censer-echo",
    operator: "add",
    comparator: "eq",
    equationShape: "find-missing-result",
    staticOperand: { position: "first", value: 4 },
    target: 5,
    hp: 15,
    handValueRange: { min: 1, max: 5 },
  },
  // ── ROUND 6 — find-missing-result + subtract ────────────────────────
  // Third (and capped) encounter — posters flip to _L2. Equation shape:
  // `static - ? = ?`. Same 1–5 cap as R5: every kid-played card is in
  // [1, 5]. Static is chosen so static − a ∈ [1, 5] is always
  // satisfiable; that means static ∈ [4, 10]:
  //
  //   static=6 → a∈[1,5], b∈[1,5]   (widest — 5 valid pairs)
  //   static=5 → a∈[1,4], b∈[1,4]
  //   static=7 → a∈[2,5], b∈[2,5]
  //   static=8 → a∈[3,5], b∈[3,5]
  //   static=9 → a∈[4,5], b∈[4,5]   (tightest — 2 pairs)
  //
  // Position is always "first" so the static is the minuend (`K − ? = ?`).
  // "Second" would mean `a − K = b`, forcing a ≥ K — narrow, awkward, and
  // pedagogically weaker for "count down from K." HP scales gently; per-
  // turn damage caps at 5 same as R5.
  {
    index: 29,
    enemyId: "hadal-glass-manta-echo",
    operator: "subtract",
    comparator: "eq",
    equationShape: "find-missing-result",
    staticOperand: { position: "first", value: 6 },
    target: 5,
    hp: 8,
    handValueRange: { min: 1, max: 5 },
  },
  {
    index: 30,
    enemyId: "hadal-brine-needle-urchin-echo",
    operator: "subtract",
    comparator: "eq",
    equationShape: "find-missing-result",
    staticOperand: { position: "first", value: 5 },
    target: 4,
    hp: 10,
    handValueRange: { min: 1, max: 5 },
  },
  {
    index: 31,
    enemyId: "hadal-basalt-lantern-leech-echo",
    operator: "subtract",
    comparator: "eq",
    equationShape: "find-missing-result",
    staticOperand: { position: "first", value: 7 },
    target: 5,
    hp: 12,
    handValueRange: { min: 1, max: 5 },
  },
  {
    index: 32,
    enemyId: "hadal-sandglass-stalker-echo",
    operator: "subtract",
    comparator: "eq",
    equationShape: "find-missing-result",
    staticOperand: { position: "first", value: 8 },
    target: 5,
    hp: 14,
    handValueRange: { min: 1, max: 5 },
  },
  {
    index: 33,
    enemyId: "hadal-kelp-censer-echo",
    operator: "subtract",
    comparator: "eq",
    equationShape: "find-missing-result",
    staticOperand: { position: "first", value: 9 },
    target: 5,
    hp: 18,
    handValueRange: { min: 1, max: 5 },
  },
];

export const FINAL_LEVEL_INDEX: number = LEVELS.length;

// Round boundaries — the LAST level index of each round. Used by the
// route's round indicator and the celebration trigger.
export const ROUND_BOUNDARIES: readonly number[] = [6, 12, 18, 23, 28, 33];

export function findLevel(index: number): LevelConfig | undefined {
  return LEVELS.find((l) => l.index === index);
}

// Which round (1-indexed) does a given level belong to?
export function roundOf(levelIndex: number): 1 | 2 | 3 | 4 | 5 | 6 {
  if (levelIndex <= 6) return 1;
  if (levelIndex <= 12) return 2;
  if (levelIndex <= 18) return 3;
  if (levelIndex <= 23) return 4;
  if (levelIndex <= 28) return 5;
  return 6;
}

export function levelsInRound(round: 1 | 2 | 3 | 4 | 5 | 6): number {
  if (round === 1) return 6;
  if (round === 2) return 6;
  if (round === 3) return 6;
  if (round === 4) return 5;
  if (round === 5) return 5;
  return 5;
}

// Local level index within a round (1-based). Used by the indicator dots.
export function localLevelIndex(levelIndex: number): number {
  if (levelIndex <= 6) return levelIndex;
  if (levelIndex <= 12) return levelIndex - 6;
  if (levelIndex <= 18) return levelIndex - 12;
  if (levelIndex <= 23) return levelIndex - 18;
  if (levelIndex <= 28) return levelIndex - 23;
  return levelIndex - 28;
}

// Backwards-compatibility shims for callers that already imported the
// old tier helpers. Tier == round in the new model.
export const TIER_1_LAST_INDEX: number = 6;
export const tierOf = roundOf;
