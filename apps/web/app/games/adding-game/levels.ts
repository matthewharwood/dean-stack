import type { Comparator, EquationShape, Operator } from "@dean-stack/schemas";

// Per-level configuration: which enemy you fight, what equation shape the
// dealer produces, what value range hand cards are drawn from, and how
// much HP the enemy has THIS round (since the same enemy returns across
// rounds with mounting HP). Damage = `target` value on a winning eval
// for find-sum levels; for find-missing-result levels, damage = the kid's
// chosen result card.
//
// SIXTEEN ROUNDS structure (the kid's progression):
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
//   Round 7 — five star-siege echoes begin a new poster arc. Same SHAPE
//             as R5, but the value cap rises to 20 so the kid counts up
//             from a larger static into the teens.
//   Round 8 — the star-siege echoes return for _L1. Subtraction mirrors
//             R6 with a larger static, forcing count-down from the high
//             teens.
//   Round 9 — the star-siege echoes return for _L2. stepper-sum + add
//             (answers 1..10) introduces the no-drag tap mechanic.
//   Round 10 — five final swarm echoes begin their poster arc.
//              stepper-sum + subtract (answers 1..10).
//   Round 11 — the final swarm echoes return for _L1. stepper-sum + MIX
//              of add/subtract (answers 1..20). `mixedOperator: true`
//              flips the dealer's per-round coin; the kid reads the
//              operator pill and steps in the right direction.
//   Round 12 — the final swarm echoes return for _L2.
//              true-false-multiply introduces multiplication at the end
//              of the campaign as the brand-new concept that warrants
//              its own mechanic.
//   Round 13 — same five final swarm echoes one more time (posters cap
//              at _L2 — same look as R12). find-missing-factor inverts
//              the R12 mechanic: instead of judging True/False on a
//              completed `a × b = c`, the kid SOLVES for the missing
//              factor. Layout: [a locked] × [stepper] = [c locked]; the
//              stepper card holds the kid's guess and they tap +/- on
//              it until `a × stepper === c`. Factors capped at 1..10
//              (the classic times-tables range); stepper clamps to
//              [0, 10]. Damage = stepper.value (same reward shape as
//              the R9–R11 stepper rounds — solving the equation IS the
//              damage).
//   Round 14 — same five final swarm echoes; posters still _L2.
//              find-leading-factor flip-flops R13's variable position:
//              the stepper is on the LEFT now, the static second
//              factor is in the middle, the product is on the right.
//              `? × b = c` instead of `a × ? = c`. Mathematically
//              equivalent (commutativity) but reading direction
//              differs, which is the pedagogical lesson — "count of
//              groups" can sit on either side of the size. Same
//              factor cap, same damage shape.
//   Round 15 — same five final swarm echoes; posters still _L2.
//              find-product moves the stepper to the RIGHT-HAND SIDE
//              and shows BOTH factors: `a × b = ?`. The kid is
//              computing the product instead of finding a factor.
//              Stepper clamps to [0, 100] because the product can be
//              that high; damage = stepper.value (the total tallies).
//              HP per level scales up to absorb the bigger damage and
//              keep the 2–4-turns-per-enemy pace.
//   Round 16 — TIMES TABLE TOWER. Completely different cadence: 11
//              "row" stages (L1..L11, one per multiplier 0..10) +
//              1 capstone "rooftop" stage (L12) = 12 levels. New
//              enemy: a single sustained boss (Tower Keeper's
//              Shadow) across all 12 levels — armor falls one tier
//              per cleared floor.
//              Row stages use the chant-row equation shape: kid
//              listens to a pre-recorded ElevenLabs chant ("Zero
//              sevens are zero. One seven is seven. Two sevens are
//              fourteen.…") and taps the matching step on the
//              stairs on the beat. Damage = 1 per step nailed.
//              The capstone uses the rooftop-grid shape: the entire
//              11×11 times table fills the screen; the NPC calls
//              out a product and the kid taps any cell containing
//              that value (commutativity gives 2 valid cells for
//              most products). Damage = the product.
//              Row order is tuned for pedagogy, not numeric: the
//              gimme rows (×0, ×1) sit first, then the muscle of
//              the round (×2,3,4,6), then "free win" reward rows
//              (×5, ×10), then the trickier finishers (×9, ×7, ×8).
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
type StaticOperandConfig = {
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
  // Only meaningful when equationShape === "stepper-sum". When true,
  // the dealer flips a coin per round to choose add vs subtract,
  // overriding `operator`. R11 ("mix") sets this true; R9 (pure add)
  // and R10 (pure subtract) leave it false / unset and the dealer
  // honors `operator` directly.
  mixedOperator?: boolean;
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
  // ── ROUND 7 — find-missing-result + add, values to 20 ───────────────
  // Five star-siege echoes begin their poster arc. Same shape as R5
  // (`static + ? = ?` / `? + static = ?`) but every kid-played card is in
  // [1, 20] instead of [1, 5]. Static ramps to 14 so the kid is still
  // mostly computing into the teens, not stuck at the ceiling. Per-turn
  // damage = kid's chosen result ∈ [static+1, 20]; HP is tuned to keep
  // turns-per-enemy in the 2–4 range.
  {
    index: 34,
    enemyId: "hadal-spark-shrimp-drone-echo",
    operator: "add",
    comparator: "eq",
    equationShape: "find-missing-result",
    staticOperand: { position: "first", value: 5 },
    target: 20,
    hp: 18,
    handValueRange: { min: 1, max: 20 },
  },
  {
    index: 35,
    enemyId: "hadal-crystal-tide-oracle-echo",
    operator: "add",
    comparator: "eq",
    equationShape: "find-missing-result",
    staticOperand: { position: "second", value: 8 },
    target: 20,
    hp: 22,
    handValueRange: { min: 1, max: 20 },
  },
  {
    index: 36,
    enemyId: "hadal-brineblade-reaver-echo",
    operator: "add",
    comparator: "eq",
    equationShape: "find-missing-result",
    staticOperand: { position: "first", value: 10 },
    target: 20,
    hp: 26,
    handValueRange: { min: 1, max: 20 },
  },
  {
    index: 37,
    enemyId: "hadal-void-spore-sentinel-echo",
    operator: "add",
    comparator: "eq",
    equationShape: "find-missing-result",
    staticOperand: { position: "second", value: 12 },
    target: 20,
    hp: 30,
    handValueRange: { min: 1, max: 20 },
  },
  {
    index: 38,
    enemyId: "hadal-starcurrent-seraph-echo",
    operator: "add",
    comparator: "eq",
    equationShape: "find-missing-result",
    staticOperand: { position: "first", value: 14 },
    target: 20,
    hp: 36,
    handValueRange: { min: 1, max: 20 },
  },
  // ── ROUND 8 — find-missing-result + subtract, values to 20 ──────────
  // Second encounter for the star-siege echoes, so posters flip to _L1.
  // Mirrors R6 (`static − ? = ?`, position always "first" so the static
  // is the minuend) but with the 1..20 cap. Statics ramp 10 → 19 so the
  // kid is counting down from the high teens by the last level. Per-turn
  // damage = kid's chosen result ∈ [1, static−1]; HP is calibrated
  // against the expected per-turn damage so turns-per-enemy stays in the
  // 2–4 range.
  {
    index: 39,
    enemyId: "hadal-spark-shrimp-drone-echo",
    operator: "subtract",
    comparator: "eq",
    equationShape: "find-missing-result",
    staticOperand: { position: "first", value: 10 },
    target: 9,
    hp: 14,
    handValueRange: { min: 1, max: 20 },
  },
  {
    index: 40,
    enemyId: "hadal-crystal-tide-oracle-echo",
    operator: "subtract",
    comparator: "eq",
    equationShape: "find-missing-result",
    staticOperand: { position: "first", value: 12 },
    target: 11,
    hp: 18,
    handValueRange: { min: 1, max: 20 },
  },
  {
    index: 41,
    enemyId: "hadal-brineblade-reaver-echo",
    operator: "subtract",
    comparator: "eq",
    equationShape: "find-missing-result",
    staticOperand: { position: "first", value: 15 },
    target: 14,
    hp: 22,
    handValueRange: { min: 1, max: 20 },
  },
  {
    index: 42,
    enemyId: "hadal-void-spore-sentinel-echo",
    operator: "subtract",
    comparator: "eq",
    equationShape: "find-missing-result",
    staticOperand: { position: "first", value: 17 },
    target: 16,
    hp: 28,
    handValueRange: { min: 1, max: 20 },
  },
  {
    index: 43,
    enemyId: "hadal-starcurrent-seraph-echo",
    operator: "subtract",
    comparator: "eq",
    equationShape: "find-missing-result",
    staticOperand: { position: "first", value: 19 },
    target: 18,
    hp: 32,
    handValueRange: { min: 1, max: 20 },
  },
  // ── ROUND 9 — stepper-sum (addition, answer 1..10) ──────────────────
  // The kid has been doing find-missing-result with drag for R5–R8.
  // R9 introduces the stepper mechanic: a single card holds the answer,
  // and the kid bumps it up or down via the top/bottom halves of the
  // card until it matches. No hand, no drag — the math is the same
  // ("a + b = ?") but the locus of control is the kid's tap rhythm,
  // not card selection.
  //
  // Operand range: handValueRange = [0, 10]; the dealer constrains
  // a + b ∈ [1, level.target]. Stepper starts ±1–3 from the answer
  // so the kid decides each round whether to tap + or −.
  //
  // Damage on win = stepper.value (same reward shape as R5–R8). This is
  // the third encounter for the star-siege echoes, so posters flip to _L2.
  // The difficulty signal is now both the evolved poster and the new
  // mechanic.
  {
    index: 44,
    enemyId: "hadal-spark-shrimp-drone-echo",
    operator: "add",
    comparator: "eq",
    equationShape: "stepper-sum",
    target: 6,
    hp: 8,
    handValueRange: { min: 0, max: 6 },
  },
  {
    index: 45,
    enemyId: "hadal-crystal-tide-oracle-echo",
    operator: "add",
    comparator: "eq",
    equationShape: "stepper-sum",
    target: 8,
    hp: 12,
    handValueRange: { min: 0, max: 8 },
  },
  {
    index: 46,
    enemyId: "hadal-brineblade-reaver-echo",
    operator: "add",
    comparator: "eq",
    equationShape: "stepper-sum",
    target: 10,
    hp: 18,
    handValueRange: { min: 0, max: 10 },
  },
  {
    index: 47,
    enemyId: "hadal-void-spore-sentinel-echo",
    operator: "add",
    comparator: "eq",
    equationShape: "stepper-sum",
    target: 10,
    hp: 24,
    handValueRange: { min: 0, max: 10 },
  },
  {
    index: 48,
    enemyId: "hadal-starcurrent-seraph-echo",
    operator: "add",
    comparator: "eq",
    equationShape: "stepper-sum",
    target: 10,
    hp: 30,
    handValueRange: { min: 0, max: 10 },
  },
  // ── ROUND 10 — stepper-sum (subtraction, answer 1..10) ──────────────
  // Same mechanic as R9, inverse operator. The kid taps − more often
  // here because the answer is usually smaller than the minuend. Five
  // final swarm echoes begin their poster arc.
  {
    index: 49,
    enemyId: "hadal-chitin-scout-echo",
    operator: "subtract",
    comparator: "eq",
    equationShape: "stepper-sum",
    target: 6,
    hp: 8,
    handValueRange: { min: 0, max: 10 },
  },
  {
    index: 50,
    enemyId: "hadal-warpcoral-prism-echo",
    operator: "subtract",
    comparator: "eq",
    equationShape: "stepper-sum",
    target: 8,
    hp: 12,
    handValueRange: { min: 0, max: 12 },
  },
  {
    index: 51,
    enemyId: "hadal-plasma-reef-lancer-echo",
    operator: "subtract",
    comparator: "eq",
    equationShape: "stepper-sum",
    target: 10,
    hp: 18,
    handValueRange: { min: 0, max: 15 },
  },
  {
    index: 52,
    enemyId: "hadal-orbital-siege-urchin-echo",
    operator: "subtract",
    comparator: "eq",
    equationShape: "stepper-sum",
    target: 10,
    hp: 24,
    handValueRange: { min: 0, max: 18 },
  },
  {
    index: 53,
    enemyId: "hadal-abyssal-fleetmind-echo",
    operator: "subtract",
    comparator: "eq",
    equationShape: "stepper-sum",
    target: 10,
    hp: 30,
    handValueRange: { min: 0, max: 20 },
  },
  // ── ROUND 11 — stepper-sum (mixed add/subtract, answer 1..20) ───────
  // Second encounter for the final swarm echoes, so posters flip to _L1.
  // `mixedOperator: true` flips the dealer's per-round coin between add
  // and subtract — the kid has to read the operator pill each round AND
  // choose direction on the stepper. Answer cap doubles to 20 so the
  // stepper interaction has weight without becoming tedious.
  {
    index: 54,
    enemyId: "hadal-chitin-scout-echo",
    operator: "add",
    comparator: "eq",
    equationShape: "stepper-sum",
    mixedOperator: true,
    target: 12,
    hp: 14,
    handValueRange: { min: 0, max: 12 },
  },
  {
    index: 55,
    enemyId: "hadal-warpcoral-prism-echo",
    operator: "add",
    comparator: "eq",
    equationShape: "stepper-sum",
    mixedOperator: true,
    target: 15,
    hp: 18,
    handValueRange: { min: 0, max: 15 },
  },
  {
    index: 56,
    enemyId: "hadal-plasma-reef-lancer-echo",
    operator: "add",
    comparator: "eq",
    equationShape: "stepper-sum",
    mixedOperator: true,
    target: 18,
    hp: 24,
    handValueRange: { min: 0, max: 18 },
  },
  {
    index: 57,
    enemyId: "hadal-orbital-siege-urchin-echo",
    operator: "add",
    comparator: "eq",
    equationShape: "stepper-sum",
    mixedOperator: true,
    target: 20,
    hp: 30,
    handValueRange: { min: 0, max: 20 },
  },
  {
    index: 58,
    enemyId: "hadal-abyssal-fleetmind-echo",
    operator: "add",
    comparator: "eq",
    equationShape: "stepper-sum",
    mixedOperator: true,
    target: 20,
    hp: 36,
    handValueRange: { min: 0, max: 20 },
  },
  // ── ROUND 12 — true-false-multiply (multiplication intro) ───────────
  // Third encounter for the final swarm echoes, so posters flip to _L2.
  // Same content as the previous R9 multiplication round — moved to R12
  // so the stepper sequence (R9–R11) lands first as a bridge between
  // drag-based math (R5–R8) and the brand-new multiplication mechanic
  // here.
  //
  // The kid has NEVER seen multiplication. R12 introduces it as a
  // true/false judgment: the dealer puts a complete `a × b = c` on the
  // board (sometimes true, sometimes off by ±1), and the kid drags a
  // True or False card onto a verdict slot. The equation view ALWAYS
  // renders a dot array (a rows × b cols) beneath the equation so the
  // kid can verify by counting — no multiplication knowledge required.
  //
  // Factor scope is locked at 1..3 (handValueRange below doubles as the
  // factor range for this shape). Max product = 9, max distractor = 10
  // — both fit in the single ten-frame array we render. Per-turn damage
  // = level.target, calibrated for ~2–4 turns per enemy at flat damage
  // (no per-card agency in this shape, so the reward is flat per level).
  {
    index: 59,
    enemyId: "hadal-chitin-scout-echo",
    operator: "multiply",
    comparator: "eq",
    equationShape: "true-false-multiply",
    target: 4,
    hp: 8,
    handValueRange: { min: 1, max: 3 },
  },
  {
    index: 60,
    enemyId: "hadal-warpcoral-prism-echo",
    operator: "multiply",
    comparator: "eq",
    equationShape: "true-false-multiply",
    target: 5,
    hp: 12,
    handValueRange: { min: 1, max: 3 },
  },
  {
    index: 61,
    enemyId: "hadal-plasma-reef-lancer-echo",
    operator: "multiply",
    comparator: "eq",
    equationShape: "true-false-multiply",
    target: 6,
    hp: 16,
    handValueRange: { min: 1, max: 3 },
  },
  {
    index: 62,
    enemyId: "hadal-orbital-siege-urchin-echo",
    operator: "multiply",
    comparator: "eq",
    equationShape: "true-false-multiply",
    target: 6,
    hp: 20,
    handValueRange: { min: 1, max: 3 },
  },
  {
    index: 63,
    enemyId: "hadal-abyssal-fleetmind-echo",
    operator: "multiply",
    comparator: "eq",
    equationShape: "true-false-multiply",
    target: 7,
    hp: 24,
    handValueRange: { min: 1, max: 3 },
  },
  // ── ROUND 13 — find-missing-factor (solve for the multiplier) ───────
  // Fourth (and final) encounter for the final swarm echoes — posters
  // are already at the _L2 cap, so visually R13 reads like R12. The
  // signal that this is harder is the MECHANIC: instead of judging a
  // claimed product True/False, the kid SOLVES for the missing factor
  // on a real `a × ? = c` equation.
  //
  // Layout: [a locked] × [stepper] = [c locked]. The stepper card sits
  // in the middle slot; the kid taps top/bottom to bump its value.
  // `c` is shown, so the kid knows the target. Factors capped at 1..10
  // (classic times tables); stepper clamps to [0, 10] so the kid can
  // sweep the full range without an artificial ceiling.
  //
  // Damage = stepper.value on a win — same reward shape as R9–R11
  // stepper-sum (the kid's chosen value IS the hit). HP is calibrated
  // against expected damage in the [1, 10] range for 2–4 turns/enemy.
  //
  // `handValueRange` doubles as the factor range for this shape (mirrors
  // how true-false-multiply uses it). `target` carries the worst-case
  // factor — it's the stepper's upper bound during the dealer's "near
  // the answer" start-value pick, and it lines up with the route's
  // useGameStepper clamp.
  {
    index: 64,
    enemyId: "hadal-chitin-scout-echo",
    operator: "multiply",
    comparator: "eq",
    equationShape: "find-missing-factor",
    target: 10,
    hp: 10,
    handValueRange: { min: 1, max: 5 },
  },
  {
    index: 65,
    enemyId: "hadal-warpcoral-prism-echo",
    operator: "multiply",
    comparator: "eq",
    equationShape: "find-missing-factor",
    target: 10,
    hp: 14,
    handValueRange: { min: 1, max: 6 },
  },
  {
    index: 66,
    enemyId: "hadal-plasma-reef-lancer-echo",
    operator: "multiply",
    comparator: "eq",
    equationShape: "find-missing-factor",
    target: 10,
    hp: 18,
    handValueRange: { min: 1, max: 8 },
  },
  {
    index: 67,
    enemyId: "hadal-orbital-siege-urchin-echo",
    operator: "multiply",
    comparator: "eq",
    equationShape: "find-missing-factor",
    target: 10,
    hp: 22,
    handValueRange: { min: 1, max: 9 },
  },
  {
    index: 68,
    enemyId: "hadal-abyssal-fleetmind-echo",
    operator: "multiply",
    comparator: "eq",
    equationShape: "find-missing-factor",
    target: 10,
    hp: 28,
    handValueRange: { min: 1, max: 10 },
  },
  // ── ROUND 14 — find-leading-factor (stepper on the LEFT) ────────────
  // Same mechanic as R13, mirrored. Layout: [stepper] × [b locked] =
  // [c locked]. The kid finds the count of groups when the static
  // group size is in the MIDDLE instead of on the left. HP mirrors
  // R13 since damage = stepper.value (factor in [1, 10]) is unchanged.
  {
    index: 69,
    enemyId: "hadal-chitin-scout-echo",
    operator: "multiply",
    comparator: "eq",
    equationShape: "find-leading-factor",
    target: 10,
    hp: 10,
    handValueRange: { min: 1, max: 5 },
  },
  {
    index: 70,
    enemyId: "hadal-warpcoral-prism-echo",
    operator: "multiply",
    comparator: "eq",
    equationShape: "find-leading-factor",
    target: 10,
    hp: 14,
    handValueRange: { min: 1, max: 6 },
  },
  {
    index: 71,
    enemyId: "hadal-plasma-reef-lancer-echo",
    operator: "multiply",
    comparator: "eq",
    equationShape: "find-leading-factor",
    target: 10,
    hp: 18,
    handValueRange: { min: 1, max: 8 },
  },
  {
    index: 72,
    enemyId: "hadal-orbital-siege-urchin-echo",
    operator: "multiply",
    comparator: "eq",
    equationShape: "find-leading-factor",
    target: 10,
    hp: 22,
    handValueRange: { min: 1, max: 9 },
  },
  {
    index: 73,
    enemyId: "hadal-abyssal-fleetmind-echo",
    operator: "multiply",
    comparator: "eq",
    equationShape: "find-leading-factor",
    target: 10,
    hp: 28,
    handValueRange: { min: 1, max: 10 },
  },
  // ── ROUND 15 — find-product (multi-choice) ─────────────────────────
  // The kid taps one of 5 candidate product cards. Damage = 1 per
  // correct, so HP per level = the count of equations the kid must
  // solve to fell the enemy. The cheat path that the prior stepper
  // version had (read a hint that names the gap, increment to the
  // answer) is closed by construction: each pick is a full commit,
  // wrong picks re-deal the same a/b with fresh distractors.
  //
  // `target` doubles as the per-level hint reference; the evaluator
  // does NOT compare against it for this shape. handValueRange ramps
  // the factor pool so early levels practice small tables (1..5)
  // before stretching to the full 1..10 by L5.
  {
    index: 74,
    enemyId: "hadal-chitin-scout-echo",
    operator: "multiply",
    comparator: "eq",
    equationShape: "find-product",
    target: 1,
    hp: 5,
    handValueRange: { min: 1, max: 5 },
  },
  {
    index: 75,
    enemyId: "hadal-warpcoral-prism-echo",
    operator: "multiply",
    comparator: "eq",
    equationShape: "find-product",
    target: 1,
    hp: 7,
    handValueRange: { min: 1, max: 6 },
  },
  {
    index: 76,
    enemyId: "hadal-plasma-reef-lancer-echo",
    operator: "multiply",
    comparator: "eq",
    equationShape: "find-product",
    target: 1,
    hp: 9,
    handValueRange: { min: 1, max: 8 },
  },
  {
    index: 77,
    enemyId: "hadal-orbital-siege-urchin-echo",
    operator: "multiply",
    comparator: "eq",
    equationShape: "find-product",
    target: 1,
    hp: 12,
    handValueRange: { min: 1, max: 9 },
  },
  {
    index: 78,
    enemyId: "hadal-abyssal-fleetmind-echo",
    operator: "multiply",
    comparator: "eq",
    equationShape: "find-product",
    target: 1,
    hp: 15,
    handValueRange: { min: 1, max: 10 },
  },
  // ── ROUND 16 — TIMES TABLE TOWER ────────────────────────────────────
  // 11 row stages (L1..L11, one chant per multiplier 0..10) + 1
  // rooftop capstone. Single sustained boss (Tower Keeper's Shadow)
  // across all 12 levels — armor falls one tier per cleared floor.
  // `target` on row levels = the row's static multiplier (0..10), used
  // by the dealer to pick the matching chant MP3. `handValueRange` is
  // unused for these shapes; passed [1, 10] as a baseline.
  //
  // HP: damage = 1 per beat nailed (11 beats per row → 11 max). Per-
  // row HP is 11 so a perfect run clears the floor in one chant; off-
  // beat taps just don't damage, no fail state.
  //
  // Row ORDER mirrors Calvin's pedagogy plan:
  //   L1 ×0, L2 ×1     — gimmes
  //   L3 ×2, L4 ×3, L5 ×4, L6 ×6 — muscle
  //   L7 ×5, L8 ×10   — free wins
  //   L9 ×9, L10 ×7, L11 ×8     — finishers
  //   L12 ROOFTOP capstone (rooftop-grid)
  //
  // Rooftop HP = 15 because each correct grid-tap deals damage equal
  // to the product. Average product across the 15 prompts ≈ 25; total
  // damage budget far exceeds 15 so the kid finishes in 3-5 prompts.
  {
    index: 79,
    enemyId: "tower-keepers-shadow",
    operator: "multiply",
    comparator: "eq",
    equationShape: "chant-row",
    target: 0,
    hp: 11,
    handValueRange: { min: 1, max: 10 },
  },
  {
    index: 80,
    enemyId: "tower-keepers-shadow",
    operator: "multiply",
    comparator: "eq",
    equationShape: "chant-row",
    target: 1,
    hp: 11,
    handValueRange: { min: 1, max: 10 },
  },
  {
    index: 81,
    enemyId: "tower-keepers-shadow",
    operator: "multiply",
    comparator: "eq",
    equationShape: "chant-row",
    target: 2,
    hp: 11,
    handValueRange: { min: 1, max: 10 },
  },
  {
    index: 82,
    enemyId: "tower-keepers-shadow",
    operator: "multiply",
    comparator: "eq",
    equationShape: "chant-row",
    target: 3,
    hp: 11,
    handValueRange: { min: 1, max: 10 },
  },
  {
    index: 83,
    enemyId: "tower-keepers-shadow",
    operator: "multiply",
    comparator: "eq",
    equationShape: "chant-row",
    target: 4,
    hp: 11,
    handValueRange: { min: 1, max: 10 },
  },
  {
    index: 84,
    enemyId: "tower-keepers-shadow",
    operator: "multiply",
    comparator: "eq",
    equationShape: "chant-row",
    target: 6,
    hp: 11,
    handValueRange: { min: 1, max: 10 },
  },
  {
    index: 85,
    enemyId: "tower-keepers-shadow",
    operator: "multiply",
    comparator: "eq",
    equationShape: "chant-row",
    target: 5,
    hp: 11,
    handValueRange: { min: 1, max: 10 },
  },
  {
    index: 86,
    enemyId: "tower-keepers-shadow",
    operator: "multiply",
    comparator: "eq",
    equationShape: "chant-row",
    target: 10,
    hp: 11,
    handValueRange: { min: 1, max: 10 },
  },
  {
    index: 87,
    enemyId: "tower-keepers-shadow",
    operator: "multiply",
    comparator: "eq",
    equationShape: "chant-row",
    target: 9,
    hp: 11,
    handValueRange: { min: 1, max: 10 },
  },
  {
    index: 88,
    enemyId: "tower-keepers-shadow",
    operator: "multiply",
    comparator: "eq",
    equationShape: "chant-row",
    target: 7,
    hp: 11,
    handValueRange: { min: 1, max: 10 },
  },
  {
    index: 89,
    enemyId: "tower-keepers-shadow",
    operator: "multiply",
    comparator: "eq",
    equationShape: "chant-row",
    target: 8,
    hp: 11,
    handValueRange: { min: 1, max: 10 },
  },
  {
    index: 90,
    enemyId: "tower-keepers-shadow",
    operator: "multiply",
    comparator: "eq",
    equationShape: "rooftop-grid",
    target: 15,
    hp: 15,
    handValueRange: { min: 1, max: 10 },
  },
];

export const FINAL_LEVEL_INDEX: number = LEVELS.length;

// Round boundaries — the LAST level index of each round. Used by the
// route's round indicator and the celebration trigger.
export const ROUND_BOUNDARIES: readonly number[] = [
  6, 12, 18, 23, 28, 33, 38, 43, 48, 53, 58, 63, 68, 73, 78, 90,
];

export function findLevel(index: number): LevelConfig | undefined {
  return LEVELS.find((l) => l.index === index);
}

export type RoundIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

// Which round (1-indexed) does a given level belong to?
export function roundOf(levelIndex: number): RoundIndex {
  if (levelIndex <= 6) return 1;
  if (levelIndex <= 12) return 2;
  if (levelIndex <= 18) return 3;
  if (levelIndex <= 23) return 4;
  if (levelIndex <= 28) return 5;
  if (levelIndex <= 33) return 6;
  if (levelIndex <= 38) return 7;
  if (levelIndex <= 43) return 8;
  if (levelIndex <= 48) return 9;
  if (levelIndex <= 53) return 10;
  if (levelIndex <= 58) return 11;
  if (levelIndex <= 63) return 12;
  if (levelIndex <= 68) return 13;
  if (levelIndex <= 73) return 14;
  if (levelIndex <= 78) return 15;
  return 16;
}

export function levelsInRound(round: RoundIndex): number {
  if (round === 1) return 6;
  if (round === 2) return 6;
  if (round === 3) return 6;
  // R16 stretches the cadence: 11 chant rows + 1 rooftop = 12 levels.
  if (round === 16) return 12;
  return 5;
}

// Local level index within a round (1-based). Used by the indicator dots.
export function localLevelIndex(levelIndex: number): number {
  if (levelIndex <= 6) return levelIndex;
  if (levelIndex <= 12) return levelIndex - 6;
  if (levelIndex <= 18) return levelIndex - 12;
  if (levelIndex <= 23) return levelIndex - 18;
  if (levelIndex <= 28) return levelIndex - 23;
  if (levelIndex <= 33) return levelIndex - 28;
  if (levelIndex <= 38) return levelIndex - 33;
  if (levelIndex <= 43) return levelIndex - 38;
  if (levelIndex <= 48) return levelIndex - 43;
  if (levelIndex <= 53) return levelIndex - 48;
  if (levelIndex <= 58) return levelIndex - 53;
  if (levelIndex <= 63) return levelIndex - 58;
  if (levelIndex <= 68) return levelIndex - 63;
  if (levelIndex <= 73) return levelIndex - 68;
  if (levelIndex <= 78) return levelIndex - 73;
  return levelIndex - 78;
}
