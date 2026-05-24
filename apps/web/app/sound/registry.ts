// SFX event registry. The single source of truth for "which sound plays
// for which game event". Adding a new event = add a key here; the type
// system propagates the literal-union to every call site.
//
// Per-character attack keys match `Attack.id` from `player-attacks.ts`
// (e.g. "mara-1"), so callers can do `play(attack.id)` directly and
// fall back to the kind base via `playAttack()` when no per-character
// variant is registered.

type SfxPolicy =
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

  // ─── Evaluate outcome (ElevenLabs-generated, ~0.5s each) ───────────
  // Fires on the Evaluate button click — `evaluate-correct` on a win
  // outcome, `evaluate-wrong` on a loss. `restart` policy so back-to-
  // back evaluations (kid mashing) cancel the previous play instead of
  // stacking. These are the "small reward / try again" cues, deliberately
  // gentle so the loss sound never feels like a scold.
  "event-evaluate-correct": {
    path: "sfx/event/evaluate-correct.mp3",
    policy: "restart",
  },
  "event-evaluate-wrong": {
    path: "sfx/event/evaluate-wrong.mp3",
    policy: "restart",
  },
  // Splash voiceover (ElevenLabs TTS, same voice id as the character
  // pronunciations). The intro auto-plays on the first splash mount;
  // the begin-descent line fires on the button click. `restart` so a
  // second tap (or a rapid mount/unmount via dev jump) cancels any
  // in-flight previous play instead of stacking.
  "event-splash-intro": {
    path: "sfx/event/splash-intro.mp3",
    policy: "restart",
  },
  "event-splash-begin-descent": {
    path: "sfx/event/splash-begin-descent.mp3",
    policy: "restart",
  },

  // Echo-Crystal pull ceremony (ElevenLabs-generated, see
  // apps/web/app/components/crystal-pull-panel/index.tsx for the
  // T=0 → T=10s storyboard). Build-up plays on panel mount and
  // sustains until the kid taps a card; select fires on tap; release
  // fires at the flip apex of the chosen crystal.
  //
  // `restart` policy on all three so a rapid double-tap or mid-pull
  // reload cancels any in-flight previous play instead of stacking.
  "event-pull-buildup": {
    path: "sfx/event/pull-buildup.mp3",
    policy: "restart",
    gain: 0.7,
  },
  "event-pull-select": {
    path: "sfx/event/pull-select.mp3",
    policy: "restart",
  },
  "event-pull-release": {
    path: "sfx/event/pull-release.mp3",
    policy: "restart",
  },

  // ─── Foley (card interactions) ─────────────────────────────────────
  // Pickup / drop sounds refreshed via ElevenLabs SFX-gen (naturalistic
  // tabletop Foley — paper-on-felt rustle for pickup, oak-board click
  // for the equation drop, paper-on-paper plop for the hand drop).
  // The old T1-FOL filenames have been retired.
  "foley-card-pickup": { path: "sfx/foley/card-pickup.mp3", policy: "restart" },
  "foley-card-drop-snap": { path: "sfx/foley/card-drop-equation.mp3", policy: "polyphony" },
  "foley-card-drop-revert": { path: "sfx/foley/card-drop-hand.mp3", policy: "restart" },
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

  // ─── Character name pronunciations (ElevenLabs voice id zYcjlYFOd3taleS0gkk3) ──
  // One MP3 per enemy + player template. Played from the speaker button
  // rendered beside the character name in EnemyAvatar / PlayerAvatar.
  // `restart` policy so back-to-back taps cancel the previous play —
  // matches the rest of the UI sound contract.
  "pronounce-tide-minnow-echo": {
    path: "sfx/pronounce/tide-minnow-echo.mp3",
    policy: "restart",
  },
  "pronounce-pressure-puff-echo": {
    path: "sfx/pronounce/pressure-puff-echo.mp3",
    policy: "restart",
  },
  "pronounce-glow-polyp-echo": {
    path: "sfx/pronounce/glow-polyp-echo.mp3",
    policy: "restart",
  },
  "pronounce-silt-crawler-echo": {
    path: "sfx/pronounce/silt-crawler-echo.mp3",
    policy: "restart",
  },
  "pronounce-ember-snail-echo": {
    path: "sfx/pronounce/ember-snail-echo.mp3",
    policy: "restart",
  },
  "pronounce-pressure-wraith": {
    path: "sfx/pronounce/pressure-wraith.mp3",
    policy: "restart",
  },
  "pronounce-glass-manta-echo": {
    path: "sfx/pronounce/glass-manta-echo.mp3",
    policy: "restart",
  },
  "pronounce-brine-needle-urchin-echo": {
    path: "sfx/pronounce/brine-needle-urchin-echo.mp3",
    policy: "restart",
  },
  "pronounce-basalt-lantern-leech-echo": {
    path: "sfx/pronounce/basalt-lantern-leech-echo.mp3",
    policy: "restart",
  },
  "pronounce-sandglass-stalker-echo": {
    path: "sfx/pronounce/sandglass-stalker-echo.mp3",
    policy: "restart",
  },
  "pronounce-kelp-censer-echo": {
    path: "sfx/pronounce/kelp-censer-echo.mp3",
    policy: "restart",
  },
  "pronounce-mara-brasswake": {
    path: "sfx/pronounce/mara-brasswake.mp3",
    policy: "restart",
  },
  "pronounce-oren-tideledger": {
    path: "sfx/pronounce/oren-tideledger.mp3",
    policy: "restart",
  },
  "pronounce-sable-kett": {
    path: "sfx/pronounce/sable-kett.mp3",
    policy: "restart",
  },
  "pronounce-pella-copperkeel": {
    path: "sfx/pronounce/pella-copperkeel.mp3",
    policy: "restart",
  },
  "pronounce-ivo-bellcurrent": {
    path: "sfx/pronounce/ivo-bellcurrent.mp3",
    policy: "restart",
  },
  "pronounce-nemi-valeglass": {
    path: "sfx/pronounce/nemi-valeglass.mp3",
    policy: "restart",
  },
  "pronounce-luma-pearlspoke": {
    path: "sfx/pronounce/luma-pearlspoke.mp3",
    policy: "restart",
  },
  "pronounce-thane-oxbell": {
    path: "sfx/pronounce/thane-oxbell.mp3",
    policy: "restart",
  },
  "pronounce-aster-drownedstar": {
    path: "sfx/pronounce/aster-drownedstar.mp3",
    policy: "restart",
  },
  "pronounce-bathypel-lantern-bride": {
    path: "sfx/pronounce/bathypel-lantern-bride.mp3",
    policy: "restart",
  },

  // ─── Second batch of enemy pronunciations (same voice id) ──────────
  // Added when the bestiary grew past the initial 11 enemies. Same
  // `restart` policy as the rest of the pronunciation pool.
  "pronounce-spark-shrimp-drone-echo": {
    path: "sfx/pronounce/spark-shrimp-drone-echo.mp3",
    policy: "restart",
  },
  "pronounce-crystal-tide-oracle-echo": {
    path: "sfx/pronounce/crystal-tide-oracle-echo.mp3",
    policy: "restart",
  },
  "pronounce-brineblade-reaver-echo": {
    path: "sfx/pronounce/brineblade-reaver-echo.mp3",
    policy: "restart",
  },
  "pronounce-void-spore-sentinel-echo": {
    path: "sfx/pronounce/void-spore-sentinel-echo.mp3",
    policy: "restart",
  },
  "pronounce-starcurrent-seraph-echo": {
    path: "sfx/pronounce/starcurrent-seraph-echo.mp3",
    policy: "restart",
  },
  "pronounce-chitin-scout-echo": {
    path: "sfx/pronounce/chitin-scout-echo.mp3",
    policy: "restart",
  },
  "pronounce-warpcoral-prism-echo": {
    path: "sfx/pronounce/warpcoral-prism-echo.mp3",
    policy: "restart",
  },
  "pronounce-plasma-reef-lancer-echo": {
    path: "sfx/pronounce/plasma-reef-lancer-echo.mp3",
    policy: "restart",
  },
  "pronounce-orbital-siege-urchin-echo": {
    path: "sfx/pronounce/orbital-siege-urchin-echo.mp3",
    policy: "restart",
  },
  "pronounce-abyssal-fleetmind-echo": {
    path: "sfx/pronounce/abyssal-fleetmind-echo.mp3",
    policy: "restart",
  },

  // ─── Echo-Crystal lore narration (same voice id as enemies/pilots) ─
  // One TTS clip per crystal that reads "<Crystal Name>. <description>"
  // aloud. Wired to the PronounceButton on the CrystalPullPanel reveal
  // info card so the kid can re-listen to what they just picked up;
  // also surfaced on the CollectionBar tooltip so they can revisit any
  // owned crystal's lore. `restart` policy so a rapid double-tap cancels
  // the previous play rather than stacking.
  "pronounce-crystal-bioluminescent-trail": {
    path: "sfx/pronounce/crystal-bioluminescent-trail.mp3",
    policy: "restart",
  },
  "pronounce-crystal-bubble-burst": {
    path: "sfx/pronounce/crystal-bubble-burst.mp3",
    policy: "restart",
  },
  "pronounce-crystal-caustic-light": {
    path: "sfx/pronounce/crystal-caustic-light.mp3",
    policy: "restart",
  },
  "pronounce-crystal-marine-snow": {
    path: "sfx/pronounce/crystal-marine-snow.mp3",
    policy: "restart",
  },
  "pronounce-crystal-phosphor-numerals": {
    path: "sfx/pronounce/crystal-phosphor-numerals.mp3",
    policy: "restart",
  },
  "pronounce-crystal-soft-hover": {
    path: "sfx/pronounce/crystal-soft-hover.mp3",
    policy: "restart",
  },
  "pronounce-crystal-edge-coral": {
    path: "sfx/pronounce/crystal-edge-coral.mp3",
    policy: "restart",
  },
  "pronounce-crystal-whisper-scale": {
    path: "sfx/pronounce/crystal-whisper-scale.mp3",
    policy: "restart",
  },
  "pronounce-crystal-maras-compass": {
    path: "sfx/pronounce/crystal-maras-compass.mp3",
    policy: "restart",
  },
  "pronounce-crystal-orens-ledger": {
    path: "sfx/pronounce/crystal-orens-ledger.mp3",
    policy: "restart",
  },
  "pronounce-crystal-sables-edge": {
    path: "sfx/pronounce/crystal-sables-edge.mp3",
    policy: "restart",
  },
  "pronounce-crystal-pellas-keel": {
    path: "sfx/pronounce/crystal-pellas-keel.mp3",
    policy: "restart",
  },
  "pronounce-crystal-ivos-bell": {
    path: "sfx/pronounce/crystal-ivos-bell.mp3",
    policy: "restart",
  },
  "pronounce-crystal-counting-pearls": {
    path: "sfx/pronounce/crystal-counting-pearls.mp3",
    policy: "restart",
  },
  "pronounce-crystal-echo-listener": {
    path: "sfx/pronounce/crystal-echo-listener.mp3",
    policy: "restart",
  },
  "pronounce-crystal-gentle-tide": {
    path: "sfx/pronounce/crystal-gentle-tide.mp3",
    policy: "restart",
  },
  "pronounce-crystal-lucky-strike": {
    path: "sfx/pronounce/crystal-lucky-strike.mp3",
    policy: "restart",
  },
  "pronounce-crystal-tide-pool": {
    path: "sfx/pronounce/crystal-tide-pool.mp3",
    policy: "restart",
  },
  // ─── R16 Times Table Tower chants (ElevenLabs voice "Alice - Clear,
  // Engaging Educator", id Xb7hH8MSUJpSbSDYk0k2). One MP3 per times-
  // table row (0..10), each ~10s @ 0.85x speed. Plus a single rooftop
  // outro that plays on capstone completion. `restart` policy so a
  // rapid replay tap cancels the in-flight playback cleanly.
  "chant-row-0": { path: "sfx/chant/row-0.mp3", policy: "restart" },
  "chant-row-1": { path: "sfx/chant/row-1.mp3", policy: "restart" },
  "chant-row-2": { path: "sfx/chant/row-2.mp3", policy: "restart" },
  "chant-row-3": { path: "sfx/chant/row-3.mp3", policy: "restart" },
  "chant-row-4": { path: "sfx/chant/row-4.mp3", policy: "restart" },
  "chant-row-5": { path: "sfx/chant/row-5.mp3", policy: "restart" },
  "chant-row-6": { path: "sfx/chant/row-6.mp3", policy: "restart" },
  "chant-row-7": { path: "sfx/chant/row-7.mp3", policy: "restart" },
  "chant-row-8": { path: "sfx/chant/row-8.mp3", policy: "restart" },
  "chant-row-9": { path: "sfx/chant/row-9.mp3", policy: "restart" },
  "chant-row-10": { path: "sfx/chant/row-10.mp3", policy: "restart" },
  "chant-rooftop": { path: "sfx/chant/rooftop.mp3", policy: "restart" },
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
