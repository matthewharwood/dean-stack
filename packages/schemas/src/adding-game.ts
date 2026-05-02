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

export const CardSchema = z.object({
  id: z.string().min(1),
  value: z.int(),
});
export type Card = z.infer<typeof CardSchema>;

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
// hand card in; null again if they drag it back.
export const EquationSlotSchema = z.object({
  id: z.string().min(1),
  cardId: z.string().nullable().default(null),
});
export type EquationSlot = z.infer<typeof EquationSlotSchema>;

export const EquationSchema = z.object({
  operandSlots: z.array(EquationSlotSchema).min(1),
  operator: OperatorSchema,
  target: CardSchema,
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

export const PlayerSchema = z.object({
  id: z.literal("player").default("player"),
  name: z.string().default("Player"),
  score: z.int().min(0).default(0),
  hand: z.array(HandSlotSchema).length(HAND_SIZE).default(emptyHand),
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

export const RoundSchema = z.object({
  index: z.int().min(1),
  phase: RoundPhaseSchema,
  equation: EquationSchema,
  outcome: RoundOutcomeSchema.nullable().default(null),
});
export type Round = z.infer<typeof RoundSchema>;

// ───── Game root ──────────────────────────────────────────────────────────

export const GameStatusSchema = z.enum(["idle", "playing", "ended"]);
export type GameStatus = z.infer<typeof GameStatusSchema>;

// IDB-persisted root. Singleton — `id` is the IDB key (matches the Settings
// pattern). round is null when status is idle or ended.
export const AddingGameStateSchema = z.object({
  id: z.literal("adding-game").default("adding-game"),
  status: GameStatusSchema.default("idle"),
  player: PlayerSchema.default(PLAYER_DEFAULT),
  enemy: EnemySchema.default(ENEMY_DEFAULT),
  cards: CardCatalogSchema,
  round: RoundSchema.nullable().default(null),
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
