// SFX event registry. The single source of truth for "which sound plays
// for which game event". Adding a new event = add a key here; the type
// system propagates the literal-union to every call site.
//
// Per-character attack keys match `Attack.id` from `player-attacks.ts`
// (e.g. "mara-1"), so callers can do `play(attack.id)` directly and
// fall back to the kind base via `playAttack()` when no per-character
// variant is registered.

export type SfxPolicy =
  | "restart" // cancel current instance, start fresh — sharp UI feedback on rapid tap
  | "polyphony" // allow simultaneous instances — combat hits stack naturally
  | "loop"; // start once, loop until stopped — ambience beds

export interface RegistryEntry {
  // Path relative to BASE_URL (no leading slash). Resolved at fetch time so the
  // GH Pages BASE_PATH prefix is honored.
  path: string;
  policy: SfxPolicy;
  // Per-event gain multiplier (0–1). Layered on top of the master volume.
  // Default 1. Use < 1 to dial back hot or busy clips.
  gain?: number;
}

// Authoring source — `as const` so `keyof` produces the literal-string
// union (SfxEventId). The exported `SFX_REGISTRY` below widens the value
// type to RegistryEntry so callers can read `entry.gain` even on entries
// that don't declare it (without the widening, TS narrows each entry to
// its own literal type and `gain` is missing from the union).
const SFX_REGISTRY_LITERAL = {
  // ─── UI ────────────────────────────────────────────────────────────
  "ui-button-click": {
    path: "sfx/ui/T1-UI-01-attack-button-click.mp3",
    policy: "restart",
  },
  "ui-dev-menu-open": {
    path: "sfx/ui/T1-UI-02-dev-menu-open.mp3",
    policy: "restart",
  },
  "ui-dev-menu-close": { path: "sfx/ui/T2-UI-01-dev-menu-close.mp3", policy: "restart" },
  "ui-dev-menu-clear-state": {
    path: "sfx/ui/T2-UI-02-dev-menu-clear-state.mp3",
    policy: "restart",
  },
  "ui-round-jump-button": { path: "sfx/ui/T2-UI-03-round-jump-button.mp3", policy: "restart" },
  "ui-pilot-cycle-click": { path: "sfx/ui/T2-UI-04-pilot-cycle-click.mp3", policy: "restart" },
  "ui-pilot-bio-flip": { path: "sfx/ui/T2-UI-05-pilot-bio-flip.mp3", policy: "restart" },
  "ui-enemy-bio-flip": { path: "sfx/ui/T2-UI-06-enemy-bio-flip.mp3", policy: "restart" },
  "ui-hint-tooltip-dismiss": {
    path: "sfx/ui/T2-UI-07-hint-tooltip-dismiss.mp3",
    policy: "restart",
  },
  "ui-operator-change-out": { path: "sfx/ui/T2-UI-08-operator-change-out.mp3", policy: "restart" },
  "ui-operator-change-in": { path: "sfx/ui/T2-UI-09-operator-change-in.mp3", policy: "restart" },
  "ui-dive-in-skip": { path: "sfx/ui/T2-CIN-03-dive-in-skip.mp3", policy: "restart" },
  "ui-evaluate-miss": { path: "sfx/ui/T1-CMB-12-player-damage-miss.mp3", policy: "restart" },

  // ─── Foley (card interactions) ─────────────────────────────────────
  "foley-card-pickup": { path: "sfx/foley/T1-FOL-01-card-pickup.mp3", policy: "restart" },
  "foley-card-drop-snap": { path: "sfx/foley/T1-FOL-02-card-drop-snap.mp3", policy: "polyphony" },
  "foley-card-drop-revert": { path: "sfx/foley/T1-FOL-03-card-drop-revert.mp3", policy: "restart" },
  "foley-card-drag-hover-enter": {
    path: "sfx/foley/T2-FOL-01-card-drag-hover-enter.mp3",
    policy: "restart",
    gain: 0.5,
  },
  "foley-card-drag-invalid-hover": {
    path: "sfx/foley/T2-FOL-02-card-drag-invalid-hover.mp3",
    policy: "restart",
  },
  "foley-card-swap-collision": {
    path: "sfx/foley/T2-FOL-03-card-swap-collision.mp3",
    policy: "polyphony",
  },
  "foley-card-flick-down": { path: "sfx/foley/T2-FOL-04-card-flick-down.mp3", policy: "polyphony" },
  "foley-card-flick-up": { path: "sfx/foley/T2-FOL-05-card-flick-up.mp3", policy: "polyphony" },

  // ─── Combat — per-kind base (fallback when per-character variant missing) ──
  "combat-slash": { path: "sfx/combat/T1-CMB-01-slash.mp3", policy: "polyphony" },
  "combat-thrust": { path: "sfx/combat/T1-CMB-02-thrust.mp3", policy: "polyphony" },
  "combat-burst": { path: "sfx/combat/T1-CMB-03-burst.mp3", policy: "polyphony" },
  "combat-beam": { path: "sfx/combat/T1-CMB-04-beam.mp3", policy: "polyphony" },
  "combat-rain": { path: "sfx/combat/T1-CMB-05-rain.mp3", policy: "polyphony" },
  "combat-vortex": { path: "sfx/combat/T1-CMB-06-vortex.mp3", policy: "polyphony" },
  "combat-wave": { path: "sfx/combat/T1-CMB-07-wave.mp3", policy: "polyphony" },
  "combat-shatter": { path: "sfx/combat/T1-CMB-08-shatter.mp3", policy: "polyphony" },
  "combat-spark": { path: "sfx/combat/T1-CMB-09-spark.mp3", policy: "polyphony" },
  "combat-echo": { path: "sfx/combat/T1-CMB-10-echo.mp3", policy: "polyphony" },
  "combat-enemy-hit": {
    path: "sfx/combat/T1-CMB-11-enemy-hit-pulse.mp3",
    policy: "polyphony",
  },
  "combat-enemy-defeat": {
    path: "sfx/combat/T2-CMB-01-enemy-defeat-vanish.mp3",
    policy: "restart",
  },

  // ─── Combat — per-character attacks (keys match Attack.id from player-attacks.ts) ──
  "mara-1": { path: "sfx/combat/T3-MARA-LANTERN-SPARK.mp3", policy: "polyphony" },
  "mara-2": { path: "sfx/combat/T3-MARA-TIDE-WHISPER.mp3", policy: "polyphony" },
  "mara-3": { path: "sfx/combat/T3-MARA-BRASS-TOLL.mp3", policy: "polyphony" },
  "oren-1": { path: "sfx/combat/T3-OREN-LEDGER-STRIKE.mp3", policy: "polyphony" },
  "oren-2": { path: "sfx/combat/T3-OREN-TALLY-MARK.mp3", policy: "polyphony" },
  "oren-3": { path: "sfx/combat/T3-OREN-TIDE-COLUMN.mp3", policy: "polyphony" },
  "sable-1": { path: "sfx/combat/T3-SABLE-BOLT-FLURRY.mp3", policy: "polyphony" },
  "sable-2": { path: "sfx/combat/T3-SABLE-WRENCH-SPIN.mp3", policy: "polyphony" },
  "sable-3": { path: "sfx/combat/T3-SABLE-STEAM-LANCE.mp3", policy: "polyphony" },
  "pella-1": { path: "sfx/combat/T3-PELLA-COPPER-CLEAVE.mp3", policy: "polyphony" },
  "pella-2": { path: "sfx/combat/T3-PELLA-KETTLE-WAVE.mp3", policy: "polyphony" },
  "pella-3": { path: "sfx/combat/T3-PELLA-GALLEY-BURST.mp3", policy: "polyphony" },
  "ivo-1": { path: "sfx/combat/T3-IVO-BELL-TOLL.mp3", policy: "polyphony" },
  "ivo-2": { path: "sfx/combat/T3-IVO-CURRENT-BEAM.mp3", policy: "polyphony" },
  "ivo-3": { path: "sfx/combat/T3-IVO-SONIC-SHATTER.mp3", policy: "polyphony" },
  "nemi-1": { path: "sfx/combat/T3-NEMI-GLASS-SLASH.mp3", policy: "polyphony" },
  "nemi-2": { path: "sfx/combat/T3-NEMI-VALE-VORTEX.mp3", policy: "polyphony" },
  "nemi-3": { path: "sfx/combat/T3-NEMI-CRYSTAL-RAIN.mp3", policy: "polyphony" },
  "luma-1": { path: "sfx/combat/T3-LUMA-PEARL-BEAM.mp3", policy: "polyphony" },
  "luma-2": { path: "sfx/combat/T3-LUMA-SPOKE-BURST.mp3", policy: "polyphony" },
  "luma-3": { path: "sfx/combat/T3-LUMA-HALO-ECHO.mp3", policy: "polyphony" },
  "thane-1": { path: "sfx/combat/T3-THANE-OX-CHARGE.mp3", policy: "polyphony" },
  "thane-2": { path: "sfx/combat/T3-THANE-WATCH-BELL.mp3", policy: "polyphony" },
  "thane-3": { path: "sfx/combat/T3-THANE-IRON-SHATTER.mp3", policy: "polyphony" },
  "aster-1": { path: "sfx/combat/T3-ASTER-STAR-SPARK.mp3", policy: "polyphony" },
  "aster-2": { path: "sfx/combat/T3-ASTER-ASTRAL-BEAM.mp3", policy: "polyphony" },
  "aster-3": { path: "sfx/combat/T3-ASTER-DROWNED-VORTEX.mp3", policy: "polyphony" },
  "bride-1": { path: "sfx/combat/T3-BRIDE-VEIL-SLASH.mp3", policy: "polyphony" },
  "bride-2": { path: "sfx/combat/T3-BRIDE-WEDDING-TOLL.mp3", policy: "polyphony" },
  "bride-3": { path: "sfx/combat/T3-BRIDE-BRIDAL-STORM.mp3", policy: "polyphony" },

  // ─── Cinematic ─────────────────────────────────────────────────────
  "cinematic-round-complete-sting": {
    path: "sfx/cinematic/T1-CIN-01-round-complete-sting.mp3",
    policy: "restart",
  },
  "cinematic-dive-in-bed": {
    path: "sfx/cinematic/T2-CIN-01-dive-in-intro-bed.mp3",
    policy: "loop",
    gain: 0.7,
  },
  "cinematic-dive-in-lantern-ignite": {
    path: "sfx/cinematic/T2-CIN-02-dive-in-lantern-ignite.mp3",
    policy: "restart",
  },
  "cinematic-round-text-appear": {
    path: "sfx/cinematic/T2-CIN-04-round-complete-text-appear.mp3",
    policy: "restart",
  },
  "cinematic-round-text-fade": {
    path: "sfx/cinematic/T2-CIN-05-round-complete-text-fade.mp3",
    policy: "restart",
  },
  "cinematic-trench-cleared": {
    path: "sfx/cinematic/T2-CIN-06-trench-cleared-final.mp3",
    policy: "restart",
  },
  "cinematic-damage-number": {
    path: "sfx/cinematic/T2-CIN-07-damage-number-spawn.mp3",
    policy: "polyphony",
  },

  // ─── Mechanical ────────────────────────────────────────────────────
  "mechanical-glow-motes-bloom": {
    path: "sfx/mechanical/T2-MEC-03-glow-motes-bloom.mp3",
    policy: "restart",
  },
  "mechanical-gold-sparkle": {
    path: "sfx/mechanical/T2-MEC-04-gold-sparkle-rare.mp3",
    policy: "restart",
  },

  // ─── Event composites ──────────────────────────────────────────────
  "event-level-up": { path: "sfx/event/T1-EVT-01-level-up.mp3", policy: "restart" },
  "event-round-win-sequence": {
    path: "sfx/event/T2-EVT-01-round-win-sequence.mp3",
    policy: "restart",
  },
  "event-round-lose-sequence": {
    path: "sfx/event/T2-EVT-02-round-lose-sequence.mp3",
    policy: "restart",
  },
  "event-pilot-cycle": {
    path: "sfx/event/T2-EVT-03-pilot-cycle-event.mp3",
    policy: "restart",
  },
  "event-game-start": { path: "sfx/event/T2-EVT-04-game-start.mp3", policy: "restart" },
  "event-game-victory": { path: "sfx/event/T2-EVT-05-game-victory.mp3", policy: "restart" },
  "event-level-up-vignette": {
    path: "sfx/event/T2-MEC-06-level-up-vignette.mp3",
    policy: "restart",
  },

  // ─── Ambience (continuous loops) ───────────────────────────────────
  "ambience-underwater": {
    path: "sfx/ambience/T1-AMB-01-underwater-gameplay-bed.mp3",
    policy: "loop",
    gain: 0.5,
  },
  "ambience-bubbles": {
    path: "sfx/ambience/T2-MEC-01-dive-in-bubbles.mp3",
    policy: "loop",
    gain: 0.4,
  },
  "ambience-marine-snow": {
    path: "sfx/ambience/T2-MEC-02-marine-snow-fall.mp3",
    policy: "loop",
    gain: 0.4,
  },
  "ambience-caustic-dance": {
    path: "sfx/ambience/T2-MEC-05-caustic-dance.mp3",
    policy: "loop",
    gain: 0.5,
  },
} as const;

export type SfxEventId = keyof typeof SFX_REGISTRY_LITERAL;

// Public, type-checked surface. Keys are the literal union (so SfxEventId
// is exhaustive); values are RegistryEntry (so `.gain` is accessible as
// `number | undefined` on every entry). The assignment validates that
// every literal entry conforms to RegistryEntry at compile time.
export const SFX_REGISTRY: { readonly [K in SfxEventId]: RegistryEntry } = SFX_REGISTRY_LITERAL;

export function isRegistered(id: string): id is SfxEventId {
  return id in SFX_REGISTRY;
}
