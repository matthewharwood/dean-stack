import * as z from "zod";

// Adding Game data model.
//
// Lifecycle (top-level):
//   route mount → "gameStart" → status: idle → playing
//   end button   → "gameEnd"  → status: playing → ended → navigate away
//
// Round lifecycle (loops while status === "playing"):
//   dealing → matching → evaluating → resolved → scoring → (next round dealing)
//
// Pillar 3: AddingGameStateSchema is the IDB-persisted root for /adding-game.
// Cards live globally on the root (not on hand/equation slots) — slots only
// hold ids, so any view (hand, equation, animation) resolves cards by lookup.
//
// Defaults follow the schemas-package contract: every defaultable field
// declares its zero with `.default()`; fully-defaultable shapes export a
// `<NAME>_DEFAULT` companion that atomWithIDB consumes directly.

// ───── Cards ──────────────────────────────────────────────────────────────
// Two card kinds share the same catalog and slot machinery:
//   - number  (R1–R8): `value: int`. The standard playable face.
//   - verdict (R9):    `verdict: boolean`. Renders as a True/False text
//                      card. Used in the true-false-multiply shape where
//                      the kid drags a verdict onto the equation instead
//                      of a number.
// The `kind` discriminator drives narrowing in consumers (dealer,
// evaluator, hints, route). `.default("number")` on the number branch
// keeps every pre-R9 IDB row re-parseable without a migration — old
// `{ id, value }` rows are routed through the number branch with kind
// filled in.
export const NumberCardSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("number").default("number"),
  value: z.int(),
});
export type NumberCard = z.infer<typeof NumberCardSchema>;

export const VerdictCardSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("verdict"),
  verdict: z.boolean(),
});
export type VerdictCard = z.infer<typeof VerdictCardSchema>;

export const CardSchema = z.union([NumberCardSchema, VerdictCardSchema]);
export type Card = z.infer<typeof CardSchema>;

export function isNumberCard(card: Card): card is NumberCard {
  return card.kind === "number";
}
export function isVerdictCard(card: Card): card is VerdictCard {
  return card.kind === "verdict";
}

// Read the numeric value off a card-or-nothing, returning undefined when
// the input is missing OR is a verdict card. Convenience used by code that
// only operates on number-card shapes (find-sum / find-missing-result
// evaluator paths, tests, hint generators) — replaces the old `?.value`
// pattern that the discriminated union made unsafe.
export function numberCardValue(card: Card | undefined | null): number | undefined {
  if (!card || !isNumberCard(card)) return undefined;
  return card.value;
}

// Flat id→card lookup. The dealer writes here at the top of every round and
// cleanup wipes consumed entries during the scoring phase.
export const CardCatalogSchema = z.record(z.string(), CardSchema).default({});
export type CardCatalog = z.infer<typeof CardCatalogSchema>;

// ───── Equation ───────────────────────────────────────────────────────────
// Renders as `[ ] op [ ] op ... = (target)`. n-ary by construction; today
// the adding game ships with two operand slots and operator: "add".

export const OperatorSchema = z.enum(["add", "subtract", "multiply", "divide"]);
export type Operator = z.infer<typeof OperatorSchema>;

// One operand slot in the equation. cardId is null until the player drags a
// hand card in; null again if they drag it back. `locked` slots are pre-filled
// by the dealer with a static value (rounds 5+) and refuse drag interactions
// at both the UI level (drag.tsx) and the reducer level (applySwap).
// `.default(false)` keeps tier-1 IDB rows re-parseable without a migration.
export const EquationSlotSchema = z.object({
  id: z.string().min(1),
  cardId: z.string().nullable().default(null),
  locked: z.boolean().default(false),
});
export type EquationSlot = z.infer<typeof EquationSlotSchema>;

// Comparator between LHS expression and target. "eq" is the default and
// matches all tier-1 levels (find a pair that equals the target). "gt"
// and "lt" introduce inequality reasoning in tier 2 — the player must
// produce a result strictly greater than / less than the target. The
// `.default("eq")` keeps tier-1 IDB rows re-parseable without a migration.
export const ComparatorSchema = z.enum(["eq", "gt", "lt"]);
export type Comparator = z.infer<typeof ComparatorSchema>;

// Equation shape — drives layout AND evaluation semantics.
//   "find-sum"             : operandSlots = [a, b], kid plays both. Win when
//                            `a OP b cmp target.value`. Tier-1 default.
//   "find-missing-result"  : operandSlots = [a, b, result], one of a/b is
//                            locked + pre-filled with a static, the other
//                            is kid-played, AND the result slot is kid-
//                            played. Win when `a OP b == result.value`.
//                            Damage = result.value (kid is rewarded for
//                            picking bigger result cards). Rounds 5+.
//   "true-false-multiply"  : operandSlots = [a, b, c], ALL locked + pre-
//                            filled. `verdictSlot` is a separate droppable
//                            slot that holds the kid's True/False verdict
//                            card. Win when the verdict matches whether
//                            `a × b == c`. Damage = the equation's target
//                            (set by the level config). R9 only.
// `.default("find-sum")` keeps tier-1 IDB rows re-parseable without a
// migration.
export const EquationShapeSchema = z.enum([
  "find-sum",
  "find-missing-result",
  "true-false-multiply",
]);
export type EquationShape = z.infer<typeof EquationShapeSchema>;

export const EquationSchema = z.object({
  shape: EquationShapeSchema.default("find-sum"),
  operandSlots: z.array(EquationSlotSchema).min(1),
  operator: OperatorSchema,
  comparator: ComparatorSchema.default("eq"),
  // For "find-sum": the displayed RHS goal card. For "find-missing-result":
  // null — the kid's chosen result card lives in `operandSlots[2]` and the
  // RHS is rendered from there. For "true-false-multiply": null — the
  // claimed product lives in `operandSlots[2]` (locked). `.default(null)`
  // keeps both shapes parseable from a single schema; deal.ts populates
  // per-shape.
  target: CardSchema.nullable().default(null),
  // R9 only — a single droppable slot where the kid lands a True/False
  // card. Null for every other shape. `.default(null)` keeps pre-R9 IDB
  // rows re-parseable without a migration.
  verdictSlot: EquationSlotSchema.nullable().default(null),
});
export type Equation = z.infer<typeof EquationSchema>;

// ───── Player & Enemy ─────────────────────────────────────────────────────

// One of the five card positions in the player's bottom row. cardId set
// during dealing, cleared when the player drags into the equation, restored
// if they drag back.
export const HandSlotSchema = z.object({
  id: z.string().min(1),
  cardId: z.string().nullable().default(null),
});
export type HandSlot = z.infer<typeof HandSlotSchema>;

export const HAND_SIZE = 5;

const emptyHand = (): HandSlot[] =>
  Array.from({ length: HAND_SIZE }, (_, i) => ({ id: `hand:${i}`, cardId: null }));

// Per-pilot progression. Each pilot in the static roster (apps/web/app/
// games/adding-game/players.ts) has its own independent xp + level.
// Switching pilots reveals their stored progress; defeating an enemy
// applies XP only to the currently-selected pilot. Persisted via the
// `pilotProgress` map on PlayerSchema below.
export const PlayerProgressSchema = z.object({
  xp: z.int().min(0).default(0),
  level: z.int().min(1).default(1),
});
export type PlayerProgress = z.infer<typeof PlayerProgressSchema>;
export const PLAYER_PROGRESS_DEFAULT: PlayerProgress = PlayerProgressSchema.parse({});

export const PlayerSchema = z.object({
  id: z.literal("player").default("player"),
  name: z.string().default("Player"),
  score: z.int().min(0).default(0),
  hand: z.array(HandSlotSchema).length(HAND_SIZE).default(emptyHand),
  // Currently-selected pilot id from the static roster. Null means no
  // selection has been made yet; the route defaults to roster[0] on the
  // first round dealt and writes the id back into IDB so the choice
  // survives reload.
  selectedPilotId: z.string().nullable().default(null),
  // Per-pilot xp/level. Sparse — only pilots that have actually accrued
  // XP appear here. Lookups for missing entries default to
  // PLAYER_PROGRESS_DEFAULT.
  pilotProgress: z.record(z.string(), PlayerProgressSchema).default({}),
});
export type Player = z.infer<typeof PlayerSchema>;
export const PLAYER_DEFAULT: Player = PlayerSchema.parse({});

// Opponent placeholder. Mechanics TBD — modeled now so future rounds can
// attach behavior (debuffs, parallel score, AI moves) without a refactor.
export const EnemySchema = z.object({
  id: z.literal("enemy").default("enemy"),
  name: z.string().default("Enemy"),
  score: z.int().min(0).default(0),
});
export type Enemy = z.infer<typeof EnemySchema>;
export const ENEMY_DEFAULT: Enemy = EnemySchema.parse({});

// ───── Round ──────────────────────────────────────────────────────────────
// Phase order is strict; each transition is one step. Phases are observable
// by listeners (sound, animations) via the GameEvent surface below.
//   dealing    – hand + equation are populated by the dealer
//   matching   – player drags cards from hand into operand slots
//   evaluating – math is computed against the target
//   resolved   – win/lose UI + sound playing
//   scoring    – score ticks up; cleanup timer (~3s) runs to next round

export const RoundPhaseSchema = z.enum([
  "dealing",
  "matching",
  "evaluating",
  "resolved",
  "scoring",
]);
export type RoundPhase = z.infer<typeof RoundPhaseSchema>;

export const RoundOutcomeSchema = z.object({
  won: z.boolean(),
  computedValue: z.number(),
  expectedValue: z.number(),
  scoreEarned: z.int().min(0),
});
export type RoundOutcome = z.infer<typeof RoundOutcomeSchema>;

// ───── Enemy ──────────────────────────────────────────────────────────────
// WoW-style rarity ramp. Rarer ⇒ fiercer. Drives the avatar's border color
// (mythic = red, the visual cap).
export const RaritySchema = z.enum(["common", "uncommon", "rare", "epic", "legendary", "mythic"]);
export type Rarity = z.infer<typeof RaritySchema>;

// Static enemy template — lives in code (apps/web/app/games/adding-game/
// enemies.ts), not in IDB. Rounds reference templates by id; the mutable
// per-round HP lives on RoundEnemySchema below.
export const EnemyTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  // Elemental type — pressure / magma / current / sand / bubble / etc.
  // Free-form string today; promote to an enum once the bestiary stabilizes.
  type: z.string().min(1),
  rarity: RaritySchema,
  maxHp: z.int().min(1),
  imageUrl: z.string().min(1),
  // 1–3 short paragraphs of lore shown on the avatar's flip-back side.
  // Allowed to span newlines; the avatar's bio renderer splits on blank
  // lines for paragraph spacing.
  bio: z.string().min(1),
  // ElevenLabs-generated pronunciation MP3, registered as a `pronounce-…`
  // entry in apps/web/app/sound/registry.ts. The avatar renders a small
  // speaker button next to the name that calls `sfx.play(nameSoundId)`.
  // Optional so unrelated tests / fixtures don't have to plumb it.
  nameSoundId: z.string().min(1).optional(),
});
export type EnemyTemplate = z.infer<typeof EnemyTemplateSchema>;

// The mutable slice held inside the round. `templateId` resolves against
// the static registry to recover name/type/rarity/maxHp/imageUrl; `hp` is
// the live, persisted current HP that ticks down as the player wins
// equations and resets between rounds.
export const RoundEnemySchema = z.object({
  templateId: z.string().min(1),
  hp: z.int().min(0),
});
export type RoundEnemy = z.infer<typeof RoundEnemySchema>;

// ───── Player roster ──────────────────────────────────────────────────────
// Mirrors EnemyTemplateSchema. Players live in the right column of the
// adding-game route the same way enemies live in the left column. For now
// the player roster is purely presentational lore — the kid cycles through
// a Lantern Guild crew and reads their bios. Game mechanics may attach
// later; the schema is shaped so adding hp/abilities later is additive.
//
// `role` is the equivalent of enemy `type` — the in-fiction job (navigator,
// engineer, cook, medic, …). Free-form string today; promote to an enum if
// the roster stabilizes the same way the bestiary will.
// ─── Attacks ─────────────────────────────────────────────────────────────
// Each player has THREE named attacks. On a winning evaluation the kid
// picks one of the three; all three apply identical damage (the equation
// target). The differentiation is **visual** — each attack runs a unique
// Pixi animation so the kid feels in control of HOW their guide fights.
//
// The system is parameterized: `kind` selects the animation primitive
// (slash / burst / beam / …), `color` tints it. Combining ~10 kinds with
// per-player color choices yields 30+ visually distinct attacks without
// 30 hand-rolled scripts. The kid sees personality through the
// combination.
export const AttackKindSchema = z.enum([
  "slash", // diagonal streak with motion blur
  "thrust", // straight bolt with leading sparks
  "burst", // radial particles outward from origin
  "beam", // solid energy line, source → target
  "rain", // particles falling from above onto target
  "vortex", // particles spiraling inward to target
  "wave", // expanding ring at impact
  "shatter", // angular shards scattering at target
  "spark", // small fast glints converging
  "echo", // concentric rings expanding outward
]);
export type AttackKind = z.infer<typeof AttackKindSchema>;

export const AttackSchema = z.object({
  id: z.string().min(1),
  // Player-facing name shown on the button ("Tideslash", "Bell Toll").
  name: z.string().min(1),
  kind: AttackKindSchema,
  // Primary tint, hex string. Drives particle / beam color.
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  // Compact glyph shown on the button next to the name. Single emoji or
  // 1–2 character symbol.
  glyph: z.string().min(1).max(4),
});
export type Attack = z.infer<typeof AttackSchema>;

export const PlayerTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  rarity: RaritySchema,
  imageUrl: z.string().min(1),
  // 1–3 short paragraphs of lore. The avatar's bio renderer parses
  // markdown-ish heading lines (`## Title`) and blank-line paragraph
  // breaks; the same renderer is used by EnemyAvatar so authors can
  // section both bestiary and roster bios identically.
  bio: z.string().min(1),
  // Three attacks. Tuple (not array) so TypeScript ensures exactly three
  // entries at the type level. The kid sees three buttons on a winning
  // evaluation, picks one — they all apply the same damage; the choice
  // is purely about which animation plays.
  attacks: z.tuple([AttackSchema, AttackSchema, AttackSchema]),
  // ElevenLabs-generated pronunciation MP3, registered as a `pronounce-…`
  // entry in apps/web/app/sound/registry.ts. The avatar renders a small
  // speaker button next to the name that calls `sfx.play(nameSoundId)`.
  // Optional so unrelated tests / fixtures don't have to plumb it.
  nameSoundId: z.string().min(1).optional(),
});
export type PlayerTemplate = z.infer<typeof PlayerTemplateSchema>;

export const RoundSchema = z.object({
  index: z.int().min(1),
  phase: RoundPhaseSchema,
  equation: EquationSchema,
  outcome: RoundOutcomeSchema.nullable().default(null),
  // `.default(null)` so existing IDB rows from before this field was added
  // re-parse cleanly on hydrate — no migration bump needed.
  enemy: RoundEnemySchema.nullable().default(null),
  // Count of LOSING evaluations the kid has racked up on this stage.
  // Resets to 0 on every fresh deal (the dealer constructs a new Round).
  // Drives two pieces of UX: the Top-region "mistakes" badge so the kid
  // sees their own count, and — for find-missing-result rounds (R5/R6) —
  // an auto-assist that fires on the 3rd wrong attempt by locking one
  // correct card into its slot. `.default(0)` keeps existing IDB rows
  // re-parseable without a migration.
  wrongAttempts: z.int().min(0).default(0),
});
export type Round = z.infer<typeof RoundSchema>;

// ───── Game root ──────────────────────────────────────────────────────────

export const GameStatusSchema = z.enum(["idle", "playing", "ended"]);
export type GameStatus = z.infer<typeof GameStatusSchema>;

// Per-template tally of how many times the kid has DEFEATED an enemy across
// the run. Read by the EnemyAvatar to derive the poster variant (default →
// _L1 → _L2) — first encounter shows the default poster, subsequent
// encounters ramp the variant. Capped at the highest variant we ship; the
// reducer in `enemy-encounters.ts` enforces the cap at write time, but the
// schema only enforces non-negative so a stale IDB row from a future
// build (more variants) re-parses cleanly here.
export const EnemyEncountersSchema = z.record(z.string(), z.int().min(0)).default({});
export type EnemyEncounters = z.infer<typeof EnemyEncountersSchema>;

// IDB-persisted root. Singleton — `id` is the IDB key (matches the Settings
// pattern). round is null when status is idle or ended.
export const AddingGameStateSchema = z.object({
  id: z.literal("adding-game").default("adding-game"),
  status: GameStatusSchema.default("idle"),
  player: PlayerSchema.default(PLAYER_DEFAULT),
  enemy: EnemySchema.default(ENEMY_DEFAULT),
  cards: CardCatalogSchema,
  round: RoundSchema.nullable().default(null),
  // Defaults to {} so existing IDB rows from before this field was added
  // re-parse cleanly on hydrate — no migration bump needed.
  enemyEncounters: EnemyEncountersSchema,
});
export type AddingGameState = z.infer<typeof AddingGameStateSchema>;
export const ADDING_GAME_DEFAULT: AddingGameState = AddingGameStateSchema.parse({});

// ───── Events ─────────────────────────────────────────────────────────────
// Cross-cutting surface for listeners that should not couple to every atom
// transition (sound, particle effects, telemetry). Implementation is left
// to the consumer — Jotai write-handler bus, plain emitter, BroadcastChannel
// re-emit. Schema is here so listeners can validate at the boundary.

export const GameEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("gameStart") }),
  z.object({ type: z.literal("gameEnd"), reason: z.enum(["userExit", "completed"]) }),
  z.object({ type: z.literal("roundStart"), roundIndex: z.int().min(1) }),
  z.object({
    type: z.literal("phaseChange"),
    roundIndex: z.int().min(1),
    from: RoundPhaseSchema,
    to: RoundPhaseSchema,
  }),
  z.object({
    type: z.literal("cardPlayed"),
    handSlotId: z.string(),
    equationSlotId: z.string(),
    cardId: z.string(),
  }),
  z.object({
    type: z.literal("cardReturned"),
    handSlotId: z.string(),
    cardId: z.string(),
  }),
  z.object({
    type: z.literal("roundResolved"),
    roundIndex: z.int().min(1),
    outcome: RoundOutcomeSchema,
  }),
  z.object({ type: z.literal("scoreTickComplete"), roundIndex: z.int().min(1) }),
]);
export type GameEvent = z.infer<typeof GameEventSchema>;
