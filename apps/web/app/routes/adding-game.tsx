import {
  type AddingGameState,
  type Attack,
  type CrystalId,
  type EnemyTemplate,
  HAND_SIZE,
  type HandSlot,
  PLAYER_DEFAULT,
  type PlayerProgress,
  type PlayerTemplate,
  PULL_TRIGGER_ROUNDS,
  type PullTriggerRound,
  type RoundEnemy,
  type RoundOutcome,
} from "@dean-stack/schemas";
import { createFileRoute } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { lazy, type ReactNode, Suspense, useEffect, useRef, useState } from "react";
import { BubbleBurstFx } from "~/components/bubble-burst-fx";
import { CollectionBar } from "~/components/collection-bar";
import { CrystalPullPanel } from "~/components/crystal-pull-panel";
import { DevMenu } from "~/components/dev-menu";
import { EnemyAvatar } from "~/components/enemy-avatar";
import { EquationView } from "~/components/equation-view";
import { GameActionButton } from "~/components/game-action-button";
import { GameBoard } from "~/components/game-board";
import { GameSplash } from "~/components/game-splash";
import { Hand } from "~/components/hand";
import { HintTooltip } from "~/components/hint-tooltip";
import { MistakesBadge } from "~/components/mistakes-badge";
import { PlayerAvatar } from "~/components/player-avatar";
import { RoundIndicator } from "~/components/round-indicator";
import { RoundJumpPanel } from "~/components/round-jump-panel";
import { VictoryPanel } from "~/components/victory-panel";
import { AttackFxLayer } from "~/games/adding-game/attack-fx/layer";
import { applyAutoAssist } from "~/games/adding-game/auto-assist";
import { buildPullOptions } from "~/games/adding-game/crystals";
import { dealRound, redealFindProductDistractors } from "~/games/adding-game/deal";
import { findEnemyTemplate } from "~/games/adding-game/enemies";
import { encountersFor, incrementEncounter } from "~/games/adding-game/enemy-encounters";
import { evaluateRound } from "~/games/adding-game/evaluate";
import { spawnDamageProjectile } from "~/games/adding-game/fx";
import { generateHints, type Hint, pickRandomHint } from "~/games/adding-game/hints";
import {
  FINAL_LEVEL_INDEX,
  findLevel,
  levelsInRound,
  localLevelIndex,
  ROUND_BOUNDARIES,
  roundOf,
} from "~/games/adding-game/levels";
import { findPlayerTemplate, PLAYER_REGISTRY } from "~/games/adding-game/players";
import { applyStep, applySwap, type SlotLocator } from "~/games/adding-game/swap";
import { applyXpGain, progressFor, xpThresholdForLevel } from "~/games/adding-game/xp";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";
import { isRegistered, type SoundApi, useSound } from "~/sound";
import { playStepperBlip } from "~/sound/procedural";
import { addingGameAtom } from "~/state/atoms";

// Pixi-driven FX (water canvas, dive-in intro, round-complete cinematic,
// attack projectile + per-attack VFX). On in every browser environment;
// gated only on SSR (Pixi can't render server-side) and an explicit
// `VITE_DISABLE_PIXI_FX=true` opt-out for the rare case where a contributor
// wants a leaner dev bundle. Default-ON in dev because the kid IS the
// dev-server audience (iPad-over-LAN per CLAUDE.md) — without the FX the
// attack flow looks broken: enemy shakes + reddens but nothing flies.
const ENABLE_PIXI_FX = !import.meta.env.SSR && import.meta.env.VITE_DISABLE_PIXI_FX !== "true";

// KEEP — code-split Pixi-heavy components. `lazy()` is the deliberate
// pattern for the iPad-bundle-budget goal (CLAUDE.md PWA section); moving
// these wrappers to a separate file just to satisfy only-export-components
// would add an indirection layer with no runtime benefit.
// react-doctor-disable-next-line react-doctor/only-export-components
const DiveInIntro = lazy(async () => {
  const { DiveInIntro: Component } = await import("~/components/dive-in-intro");
  return { default: Component };
});

// react-doctor-disable-next-line react-doctor/only-export-components
const RoundCompleteFx = lazy(async () => {
  const { RoundCompleteFx: Component } = await import("~/components/round-complete-fx");
  return { default: Component };
});

// react-doctor-disable-next-line react-doctor/only-export-components
const WaterCanvas = lazy(async () => {
  const { WaterCanvas: Component } = await import("~/components/water-canvas");
  return { default: Component };
});

export const Route = createFileRoute("/adding-game")({
  head: () => ({
    meta: buildSeoMeta({
      path: "/adding-game",
      title: "Adding Game",
      description: "Adding Game — a dean-stack browser game for practicing addition.",
    }),
    links: buildSeoLinks({ path: "/adding-game" }),
  }),
  component: AddingGame,
});

// Splash begin-descent click flow. The intro voiceover was removed
// from the splash — browser autoplay policy meant it required a click
// to fire anyway, which read as flaky. The Begin button still owns
// its own voiceover: await `playUntilEnded(begin-descent)` THEN wait
// 300ms, THEN call onBegin so the dive-in transition doesn't start
// until the spoken line lands. While we're waiting, the button is
// disabled so a double-tap can't queue a second descent.
// ─── State helpers ────────────────────────────────────────────────────────

function emptyHand(): HandSlot[] {
  return Array.from({ length: HAND_SIZE }, (_, i) => ({ id: `hand:${i}`, cardId: null }));
}

// Reset to a clean idle state. The gameStart effect picks up `round === null`
// and deals level 1, so this single setter triggers a full restart.
//
// Pilots are PERSISTENT characters — their selection and per-pilot
// xp/level survive a Play Again the same way `score` does. Only the
// dive-state (cards, hand, round) gets wiped.
function resetToIdle(state: AddingGameState): AddingGameState {
  return {
    ...state,
    status: "idle",
    cards: {},
    player: {
      ...PLAYER_DEFAULT,
      score: state.player.score,
      selectedPilotId: state.player.selectedPilotId,
      pilotProgress: state.player.pilotProgress,
      hand: emptyHand(),
    },
    round: null,
  };
}

// ─── Custom hooks (extracted from AddingGame to keep the route component
// under react-doctor's no-giant-component threshold) ─────────────────────

// Round-complete celebration — fires when the player crosses ANY round
// boundary or completes the final round. Owns its own ref + state so the
// route component doesn't carry the bookkeeping.
function useGameCelebration(
  roundIndex: number | null | undefined,
  gameStatus: AddingGameState["status"],
  enabled: boolean,
): {
  celebration: {
    fromRound: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;
  } | null;
  clear: () => void;
} {
  // Compute-during-render pattern (React's recommended fix for
  // adjust-state-on-prop-change). Track previous (roundIndex, gameStatus,
  // enabled) inside state itself; when any of those changes between
  // renders, derive the new celebration value and setState. React bails
  // out cheaply when the next state equals the previous.
  type Cel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;
  const [state, setState] = useState<{
    prevLevel: number | null;
    prevStatus: AddingGameState["status"];
    prevEnabled: boolean;
    celebration: { fromRound: Cel } | null;
  }>({
    prevLevel: roundIndex ?? null,
    prevStatus: gameStatus,
    prevEnabled: enabled,
    celebration: null,
  });

  const curr = roundIndex ?? null;
  if (
    state.prevLevel !== curr ||
    state.prevStatus !== gameStatus ||
    state.prevEnabled !== enabled
  ) {
    let nextCel = state.celebration;
    if (!enabled) {
      nextCel = null;
    } else {
      // Boundary cross: prev was a boundary level AND we advanced or completed.
      if (state.prevLevel !== null && ROUND_BOUNDARIES.includes(state.prevLevel)) {
        const advanced = curr !== null && curr > state.prevLevel;
        const completed =
          state.prevLevel === FINAL_LEVEL_INDEX && (curr === null || gameStatus === "ended");
        if (advanced || completed) {
          nextCel = { fromRound: roundOf(state.prevLevel) };
        }
      }
      // Status flipped to ended while sitting on the final level.
      if (
        gameStatus === "ended" &&
        state.prevStatus !== "ended" &&
        state.prevLevel === FINAL_LEVEL_INDEX
      ) {
        nextCel = { fromRound: 12 };
      }
    }
    setState({
      prevLevel: curr,
      prevStatus: gameStatus,
      prevEnabled: enabled,
      celebration: nextCel,
    });
  }

  return {
    celebration: state.celebration,
    clear: () => setState((s) => ({ ...s, celebration: null })),
  };
}

// ── Echo Crystal pull trigger ──────────────────────────────────────────
// Mirrors useGameCelebration: watches level-index transitions and fires
// when the kid crosses a ROUND boundary FROM a round listed in
// PULL_TRIGGER_ROUNDS. On match, writes a `pendingPull` (the 3 options
// the kid will see) into IDB-backed state via setGame. The panel reads
// pendingPull and unmounts itself by clearing it through onSelect.
//
// The trigger is idempotent on `nextPullAfterRound`: once a pull has
// resolved for round N, `nextPullAfterRound` advances past N, so the kid
// crossing R1 again on a replay won't re-trigger the same pull (until
// they reset their state via the dev menu's "Clear state").
function useCrystalPullTrigger(
  game: AddingGameState,
  setGame: (updater: (prev: AddingGameState) => AddingGameState) => void,
  enabled: boolean,
): void {
  const prevLevelRef = useRef<number | null>(game.round?.index ?? null);
  // KEEP — driven by an external Jotai store (setGame). The recommended
  // "compute during render" refactor would fire IDB writes on every
  // re-render. A useEffect transition-watcher is the correct architecture
  // for "watch prop change → emit one-shot external mutation."
  useEffect(() => {
    if (!enabled) {
      prevLevelRef.current = game.round?.index ?? null;
      return;
    }
    const curr = game.round?.index ?? null;
    const prev = prevLevelRef.current;
    prevLevelRef.current = curr;
    if (prev == null) return;
    if (!ROUND_BOUNDARIES.includes(prev)) return;
    const advanced = curr != null && curr > prev;
    const completed = prev === FINAL_LEVEL_INDEX && (curr == null || game.status === "ended");
    if (!advanced && !completed) return;
    const fromRound = roundOf(prev);
    if (!(PULL_TRIGGER_ROUNDS as readonly number[]).includes(fromRound)) return;
    // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent react-doctor/no-adjust-state-on-prop-change
    setGame((prevState) => {
      if (prevState.nextPullAfterRound !== fromRound) return prevState;
      if (prevState.pendingPull) return prevState;
      const triggered = fromRound as PullTriggerRound;
      const options = buildPullOptions(triggered, prevState.crystals);
      return {
        ...prevState,
        pendingPull: { triggeredAfterRound: triggered, options },
      };
    });
  }, [game.round?.index, game.status, enabled, setGame]);
}

// Advance to the next entry in PULL_TRIGGER_ROUNDS. If the kid is already
// past the last trigger (R11), stay there — subsequent boundary crosses
// won't match and no further pulls fire.
function advancePullTrigger(curr: PullTriggerRound): PullTriggerRound {
  const idx = (PULL_TRIGGER_ROUNDS as readonly number[]).indexOf(curr);
  const next = PULL_TRIGGER_ROUNDS[idx + 1];
  return (next ?? curr) as PullTriggerRound;
}

// Bubble Burst Tide Sigil — one burst per winning evaluation. Watches
// the round outcome and bumps an integer trigger that the BubbleBurstFx
// key listens to (remounting the burst so the CSS keyframe restarts
// cleanly). When the kid doesn't own the crystal, `enabled` stays false
// and the component renders nothing — zero overhead until acquired.
function useBubbleBurstFx(game: AddingGameState): ReactNode {
  const [trigger, setTrigger] = useState(0);
  const prevWonRef = useRef(false);
  const wonNow = game.round?.outcome?.won === true;
  // KEEP — `trigger` is a remount key for BubbleBurstFx; bumping it on
  // every false→true transition of `wonNow` is the whole point. The
  // compute-during-render refactor would re-fire the burst on every
  // render while wonNow stays true. Effect-based edge detection is the
  // right architecture for "fire on transition, not on value."
  useEffect(() => {
    // react-doctor-disable-next-line react-doctor/no-adjust-state-on-prop-change
    if (wonNow && !prevWonRef.current) setTrigger((t) => t + 1);
    prevWonRef.current = wonNow;
  }, [wonNow]);
  const enabled = game.crystals.includes("bubble-burst") && trigger > 0;
  return <BubbleBurstFx key={trigger} enabled={enabled} trigger={trigger} />;
}

// Compose the trigger + handler + render ternary into one hook so
// AddingGame stays under react-doctor's giant-component threshold.
// Returns the panel node (or null) AND the trigger effect runs as a
// side effect of the hook. The caller passes `celebration` so the panel
// holds off until the round-complete cinematic clears.
function useCrystalPullSession(
  game: AddingGameState,
  setGame: (updater: (prev: AddingGameState) => AddingGameState) => void,
  celebrationActive: boolean,
): ReactNode {
  useCrystalPullTrigger(game, setGame, true);
  if (!game.pendingPull || celebrationActive) return null;
  const handleSelect = (id: CrystalId): void => {
    setGame((prev) => ({
      ...prev,
      crystals: prev.crystals.includes(id) ? prev.crystals : [...prev.crystals, id],
      pendingPull: null,
      nextPullAfterRound: advancePullTrigger(prev.nextPullAfterRound),
    }));
  };
  return (
    <CrystalPullPanel
      options={game.pendingPull.options as [CrystalId, CrystalId, CrystalId]}
      onSelect={handleSelect}
    />
  );
}

// Hint banner state — owns the hint object, the recently-shown id, the
// outcome-tracking ref, and the two effects (outcome→hint, pointerdown
// dismissal). Returns the live hint + a stable dismiss callback.
function useGameHints(game: AddingGameState): {
  hint: Hint | null;
  dismiss: () => void;
} {
  const [hint, setHint] = useState<Hint | null>(null);
  const lastHintIdRef = useRef<string | null>(null);
  const prevOutcomeRef = useRef<RoundOutcome | null>(null);

  // KEEP — outcome edge detection (null/won → loss surfaces a new hint
  // chosen pseudo-randomly from a generated set, skipping the most-recent
  // one). Refactoring to compute-during-render would call generateHints +
  // pickRandomHint on every render and break the "don't repeat the last
  // hint" memory. Effect-based edge detection is the right architecture.
  useEffect(() => {
    const outcome = game.round?.outcome ?? null;
    if (outcome === prevOutcomeRef.current) return;
    prevOutcomeRef.current = outcome;
    if (!outcome || outcome.won) {
      // react-doctor-disable-next-line react-doctor/no-adjust-state-on-prop-change
      setHint(null);
      return;
    }
    const hints = generateHints(game);
    const next = pickRandomHint(hints, lastHintIdRef.current);
    if (!next) return;
    lastHintIdRef.current = next.id;
    // react-doctor-disable-next-line react-doctor/no-derived-state
    setHint(next);
  }, [game]);

  useEffect(() => {
    if (!hint) return;
    const onPointerDown = (e: PointerEvent): void => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-card-id]")) {
        setHint(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [hint]);

  return { hint, dismiss: () => setHint(null) };
}

// Attack flow — owns the pending-attack lock, fires the Pixi attack
// animation, and chains into Continue when it resolves. Returns a stable
// `attackPending` flag and the `runAttack(attack | null)` handler the
// route plugs into <ActionButton>.
function useAttackFlow(
  game: AddingGameState,
  sfx: SoundApi,
  onContinue: () => void,
  enableFx: boolean,
): {
  attackPending: boolean;
  runAttack: (attack: Attack | null) => void;
} {
  const [attackPending, setAttackPending] = useState(false);
  const fireAttackAnimation = async (attack: Attack): Promise<void> => {
    if (!enableFx) {
      await sfx.playAttackUntilEnded(attack);
      return;
    }
    if (typeof document === "undefined") return;
    const fromEl = document.querySelector('[data-test="action-button"]');
    const toEl = document.querySelector('[data-test="enemy-avatar"]');
    const fromRect = fromEl?.getBoundingClientRect();
    const toRect = toEl?.getBoundingClientRect();
    if (!fromRect || !toRect) return;
    spawnDamageProjectile({
      text: `−${game.round?.outcome?.scoreEarned ?? 0}`,
      from: fromEl as Element,
      to: toEl as Element,
    });
    // Run the Pixi VFX AND the attack sound concurrently, then await
    // BOTH before resolving. The enemy doesn't die / the level
    // doesn't advance until the sound has fully played — preserves
    // the "attack lands, THEN the world reacts" beat. If the sound
    // is unregistered, playAttackUntilEnded resolves immediately so
    // the animation pacing is unaffected.
    const { attackFxRuntime } = await import("~/games/adding-game/attack-fx/runtime");
    await Promise.all([
      attackFxRuntime.runAttack(
        attack,
        { x: fromRect.left, y: fromRect.top, width: fromRect.width, height: fromRect.height },
        { x: toRect.left, y: toRect.top, width: toRect.width, height: toRect.height },
      ),
      sfx.playAttackUntilEnded(attack),
    ]);
  };
  const runAttack = (attack: Attack | null): void => {
    if (attackPending) return;
    setAttackPending(true);
    const finish = (): void => {
      onContinue();
      setAttackPending(false);
    };
    if (!attack) {
      finish();
      return;
    }
    void fireAttackAnimation(attack).then(finish, finish);
  };
  return { attackPending, runAttack };
}

// Pure state transition: apply the kid's evaluation, increment wrong-attempt
// counters, and trigger the find-missing-result auto-assist on the EXACT
// 2 → 3 / 5 → 6 wrongAttempts steps. Hoisted out of AddingGame so the
// component body stays a thin orchestrator.
function evaluateAndMaybeAssist(prev: AddingGameState): AddingGameState {
  if (!prev.round) return prev;
  const stillOutcome = evaluateRound(prev);
  if (!stillOutcome) return prev;
  if (stillOutcome.won) {
    return { ...prev, round: { ...prev.round, phase: "evaluating", outcome: stillOutcome } };
  }
  const nextWrongAttempts = (prev.round.wrongAttempts ?? 0) + 1;
  const withOutcome: AddingGameState = {
    ...prev,
    round: {
      ...prev.round,
      phase: "evaluating",
      outcome: stillOutcome,
      wrongAttempts: nextWrongAttempts,
    },
  };
  const shouldAssist =
    prev.round.equation.shape === "find-missing-result" &&
    (nextWrongAttempts === 3 || nextWrongAttempts === 6);
  if (!shouldAssist) return withOutcome;
  return applyAutoAssist(withOutcome) ?? withOutcome;
}

// Pure state transition: kill enemy / advance level / re-deal. Returns
// `null` when the call is a no-op (no win, no enemy). Hoisted from
// AddingGame so the component body stays small.
function continueAfterWin(state: AddingGameState): AddingGameState | null {
  const round = state.round;
  if (!round?.outcome?.won || !round.enemy) return null;
  const damage = round.outcome.scoreEarned;
  const newHp = round.enemy.hp - damage;
  const xpGain = round.outcome.scoreEarned;
  const defeatedTemplateId = round.enemy.templateId;
  if (newHp <= 0) {
    const nextLevelIndex = round.index + 1;
    if (nextLevelIndex > FINAL_LEVEL_INDEX) {
      const pilotId = state.player.selectedPilotId;
      const pilotProgress = pilotId
        ? {
            ...state.player.pilotProgress,
            [pilotId]: applyXpGain(progressFor(state.player.pilotProgress, pilotId), xpGain).next,
          }
        : state.player.pilotProgress;
      return {
        ...state,
        status: "ended",
        cards: {},
        player: { ...state.player, hand: emptyHand(), pilotProgress },
        round: null,
        enemyEncounters: incrementEncounter(state.enemyEncounters, defeatedTemplateId),
      };
    }
    const dealt = dealRound({ levelIndex: nextLevelIndex });
    const pilotId = state.player.selectedPilotId;
    const pilotProgress = pilotId
      ? {
          ...state.player.pilotProgress,
          [pilotId]: applyXpGain(progressFor(state.player.pilotProgress, pilotId), xpGain).next,
        }
      : state.player.pilotProgress;
    return {
      ...state,
      status: "playing",
      cards: dealt.cards,
      player: { ...state.player, hand: dealt.hand, pilotProgress },
      round: dealt.round,
      enemyEncounters: incrementEncounter(state.enemyEncounters, defeatedTemplateId),
    };
  }
  // Same level, new equation/hand, preserve damaged enemy.
  const dealt = dealRound({ levelIndex: round.index });
  const damagedEnemy = { templateId: round.enemy.templateId, hp: newHp };
  return {
    ...state,
    status: "playing",
    cards: dealt.cards,
    player: { ...state.player, hand: dealt.hand },
    round: { ...dealt.round, enemy: damagedEnemy },
  };
}

// Evaluate handler hook. Delegates to the pure evaluateAndMaybeAssist
// transition, then plays the win/loss SFX after the state update lands.
// `restart` policy on both registry entries cancels any in-flight
// previous play so a rapid second tap re-fires the sound cleanly.
// Extracted from AddingGame to keep the route's body under react-
// doctor's giant-component threshold.
function useEvaluateHandler(
  setGame: (updater: (prev: AddingGameState) => AddingGameState) => void,
  sfx: ReturnType<typeof useSound>,
): () => void {
  return () => {
    setGame((prev) => {
      const next = evaluateAndMaybeAssist(prev);
      const outcome = next.round?.outcome;
      if (outcome) sfx.play(outcome.won ? "event-evaluate-correct" : "event-evaluate-wrong");
      return next;
    });
  };
}

// R15 find-product (multi-choice) tap handler. Each tap on a candidate
// card commits the chosen card into operandSlots[2], runs the evaluator,
// and on a WRONG pick triggers an immediate redeal of fresh distractors
// (same a, b — different 5 choices) so the kid can't sweep the answer
// by process of elimination. On a WIN, the standard win flow takes
// over via setGame's subsequent re-render → useContinueAfterWin path.
//
// Win/loss SFX fire after the state update lands, matching the
// useEvaluateHandler pattern. No-op for non-find-product rounds —
// defensive guard rather than a thrown error so a misconfigured route
// doesn't crash on a stale tap.
// R16 per-round state: chant mastery (which step indexes the kid has
// nailed on the current floor) + rooftop prompt (the product the NPC
// is currently calling out). Owns reset logic when the round index
// changes, the chant-tap → enemy-damage path, and the rooftop-tap →
// damage + advance-prompt path. Result shape matches what EquationView
// reads via the r16Multiplier / r16MasteredSteps / r16Prompt props.
type R16State = {
  multiplier: number;
  masteredSteps: readonly number[];
  onChantStepMastered: (stepIndex: number) => void;
  prompt: number | null;
  onRooftopCellTap: (a: number, b: number, product: number) => void;
};
function useR16State(
  game: AddingGameState,
  setGame: (updater: (prev: AddingGameState) => AddingGameState) => void,
  sfx: SoundApi,
): R16State {
  const [masteredSteps, setMasteredSteps] = useState<readonly number[]>([]);
  const [prompt, setPrompt] = useState<number | null>(null);
  const roundIndex = game.round?.index ?? null;
  const shape = game.round?.equation.shape ?? null;
  const multiplier = game.round ? (findLevel(game.round.index)?.target ?? 0) : 0;
  // KEEP — R16 reset on round-index transition. Three setStates fire in
  // a coordinated reset (mastered steps wiped, prompt either freshly
  // picked from a random-seed source or cleared). Compute-during-render
  // would re-pick a random prompt on every render and break the kid's
  // stable target. Effect-based edge detection is correct.
  const prevRoundIndexRef = useRef<number | null>(null);
  useEffect(() => {
    if (roundIndex === prevRoundIndexRef.current) return;
    prevRoundIndexRef.current = roundIndex;
    // react-doctor-disable-next-line react-doctor/no-adjust-state-on-prop-change
    setMasteredSteps([]);
    if (shape === "rooftop-grid") {
      // react-doctor-disable-next-line react-doctor/no-adjust-state-on-prop-change
      setPrompt(pickRandomProduct());
    } else {
      // react-doctor-disable-next-line react-doctor/no-adjust-state-on-prop-change
      setPrompt(null);
    }
  }, [roundIndex, shape]);

  const onChantStepMastered = (stepIndex: number): void => {
    setMasteredSteps((prev) => (prev.includes(stepIndex) ? prev : [...prev, stepIndex]));
    sfx.play("event-evaluate-correct");
    setGame((prev) => applyR16Damage(prev, 1));
  };

  const onRooftopCellTap = (_a: number, _b: number, product: number): void => {
    if (prompt == null) return;
    if (product !== prompt) {
      // Wrong cell — no-op (no damage, no fail SFX); kid keeps trying.
      return;
    }
    sfx.play("event-evaluate-correct");
    setGame((prev) => applyR16Damage(prev, product));
    // Pick a fresh prompt for the next round. Even if the kid just
    // KO'd the boss, harmless — the continueAfterWin flow will
    // immediately overwrite state with the next level deal.
    setPrompt(pickRandomProduct());
  };

  return {
    multiplier,
    masteredSteps,
    onChantStepMastered,
    prompt,
    onRooftopCellTap,
  };
}

// Synthetic damage application for R16 — operates on enemy HP
// directly (no evaluator round-trip). When HP would hit zero, sets a
// synthetic winning outcome so the standard continueAfterWin flow
// advances the level on the next handler tick.
function applyR16Damage(state: AddingGameState, amount: number): AddingGameState {
  if (!state.round?.enemy) return state;
  const enemy = state.round.enemy;
  const nextHp = Math.max(0, enemy.hp - amount);
  const downed = nextHp <= 0;
  return {
    ...state,
    round: {
      ...state.round,
      enemy: { ...enemy, hp: nextHp },
      phase: downed ? "evaluating" : state.round.phase,
      outcome: downed
        ? {
            won: true,
            computedValue: amount,
            expectedValue: amount,
            scoreEarned: amount,
          }
        : state.round.outcome,
    },
  };
}

// Random product in [0, 100] sampled uniformly over the 11×11 grid
// (each (a, b) pair equally likely). Used for the rooftop prompt
// sequence — the kid sees a fresh tap target on every hit. Math.random
// is fine here; this isn't part of the dealer's deterministic seeding.
function pickRandomProduct(): number {
  const a = Math.floor(Math.random() * 11);
  const b = Math.floor(Math.random() * 11);
  return a * b;
}

function useFindProductChooseHandler(
  setGame: (updater: (prev: AddingGameState) => AddingGameState) => void,
  sfx: ReturnType<typeof useSound>,
): (cardId: string) => void {
  return (cardId: string) => {
    setGame((prev) => {
      if (!prev.round || prev.round.equation.shape !== "find-product") return prev;
      const answerSlot = prev.round.equation.operandSlots[2];
      if (!answerSlot) return prev;
      // Commit the tapped choice into the answer slot.
      const placed: AddingGameState = {
        ...prev,
        round: {
          ...prev.round,
          equation: {
            ...prev.round.equation,
            operandSlots: prev.round.equation.operandSlots.map((s) =>
              s.id === answerSlot.id ? { ...s, cardId } : s,
            ),
          },
        },
      };
      // Evaluate immediately. evaluateAndMaybeAssist sets phase to
      // "evaluating", attaches outcome, and increments wrongAttempts
      // on a loss.
      const evaluated = evaluateAndMaybeAssist(placed);
      const outcome = evaluated.round?.outcome;
      if (outcome) sfx.play(outcome.won ? "event-evaluate-correct" : "event-evaluate-wrong");
      // On a loss, redeal the distractors immediately. The kid sees
      // the hint pop AND the choice row reshuffle — process-of-
      // elimination is now structurally impossible because the choices
      // change on every miss. On a win, return the evaluated state as
      // is so the win flow can advance.
      if (outcome && !outcome.won) {
        return redealFindProductDistractors(evaluated);
      }
      return evaluated;
    });
  };
}

// R9–R11 stepper hook. Wraps the `applyStep` reducer with the routing
// concerns the route shouldn't carry inline: resolve the current
// round's stepper card id, clamp the bump to the level's plausible
// answer ceiling (target + 3 — same offset the dealer uses for "near
// the answer" starts so the kid can over-tap a little without the
// value getting stuck), and no-op for non-stepper rounds. Mirrors the
// useGameCelebration / useGameHints pattern that keeps AddingGame's
// body small.
function useGameStepper(
  setGame: (updater: (prev: AddingGameState) => AddingGameState) => void,
): (delta: number) => void {
  return (delta: number) => {
    // Fire the procedural stepper blip before mutating state — the
    // blip is purely audible feedback for the tap and shouldn't wait
    // on the reducer. Skip when delta == 0 (defensive; reducer also
    // no-ops at the clamp edge so the kid won't hear a sound if the
    // value didn't actually move).
    if (delta !== 0) playStepperBlip(delta > 0 ? "up" : "down");
    setGame((prev) => {
      if (!prev.round) return prev;
      const shape = prev.round.equation.shape;
      // R9–R11 stepper-sum: stepper at operandSlots[2], max = level.target + 3
      // (over-tap room so the kid can sweep past the answer without sticking).
      if (shape === "stepper-sum") {
        const stepperSlot = prev.round.equation.operandSlots[2];
        if (!stepperSlot?.cardId) return prev;
        const level = findLevel(prev.round.index);
        const max = (level?.target ?? 20) + 3;
        return applyStep(prev, stepperSlot.cardId, delta, max);
      }
      // R13 find-missing-factor: stepper at operandSlots[1], HARD max = 10
      // (factors only; stepping above 10 has no pedagogical meaning, so the
      // ceiling matches the dealer's FIND_MISSING_FACTOR_MAX exactly).
      if (shape === "find-missing-factor") {
        const stepperSlot = prev.round.equation.operandSlots[1];
        if (!stepperSlot?.cardId) return prev;
        return applyStep(prev, stepperSlot.cardId, delta, 10);
      }
      // R14 find-leading-factor: stepper at operandSlots[0], same hard
      // max as R13 — the stepper is still a factor.
      if (shape === "find-leading-factor") {
        const stepperSlot = prev.round.equation.operandSlots[0];
        if (!stepperSlot?.cardId) return prev;
        return applyStep(prev, stepperSlot.cardId, delta, 10);
      }
      // R15 find-product no longer uses a stepper — see
      // useFindProductChooseHandler for the multi-choice tap flow.
      return prev;
    });
  };
}

// Auto-play pilot name pronunciation at 75% volume — fires once when
// the active pilot id changes (kid taps the cycle button, or the
// initial roster[0] default lands). The reduced volume keeps the
// announcement from startling the kid as pilots rotate.
//
// Enemy name auto-play was REMOVED intentionally: the kid read the
// new-enemy announcement as "the enemy speaks as it dies", which felt
// upsetting / scary. The speaker button beside each enemy name still
// lets the kid trigger the pronunciation deliberately when they want
// it. Pilot announcements stay because the kid initiates the change.
const AUTOPLAY_NAME_VOLUME = 0.75;

function useAutoplayCharacterNames(state: AddingGameState, sfx: SoundApi): void {
  const prevPilotIdRef = useRef<string | null>(null);

  // KEEP — pilotId is a derived prop, not an event. The "move to event
  // handler" refactor would require threading sfx through every place
  // the pilot selection mutates (dev menu, splash, lore-bio). Watching
  // pilotId here is the simplest centralized hook for the auto-play.
  // react-doctor-disable-next-line react-doctor/no-event-handler
  const pilotId = state.player.selectedPilotId;
  useEffect(() => {
    if (pilotId && pilotId !== prevPilotIdRef.current) {
      const pilot = findPlayerTemplate(pilotId);
      const id = pilot?.nameSoundId;
      if (id && isRegistered(id)) {
        sfx.play(id, { volumeScale: AUTOPLAY_NAME_VOLUME });
      }
    }
    prevPilotIdRef.current = pilotId;
  }, [pilotId, sfx]);
}

// Splash-gated panel children — three sibling nodes that all collapse
// to null on the title screen. Extracted so AddingGame's body stays
// under react-doctor's 300-line giant-component threshold.
interface PanelChildrenArgs {
  isSplash: boolean;
  enemyTemplate: EnemyTemplate | null;
  roundEnemy: RoundEnemy | null;
  game: AddingGameState;
  dragLocked: boolean;
  handleSwap: (source: SlotLocator, target: SlotLocator) => void;
  currentPlayer: PlayerTemplate | null;
  currentIndex: number;
  currentProgress: PlayerProgress | null;
  currentXpThreshold: number | null;
  handleCyclePlayer: () => void;
}

function buildPanelChildren(args: PanelChildrenArgs): {
  enemyAvatarNode: ReactNode;
  handNode: ReactNode;
  playerAvatarNode: ReactNode;
} {
  if (args.isSplash) {
    return { enemyAvatarNode: null, handNode: null, playerAvatarNode: null };
  }
  return {
    enemyAvatarNode: (
      <EnemyAvatar
        key={args.enemyTemplate?.id ?? "no-enemy"}
        enemy={args.enemyTemplate}
        hp={args.roundEnemy?.hp ?? null}
        maxHp={args.game.round ? (findLevel(args.game.round.index)?.hp ?? null) : null}
        encounters={encountersFor(args.game.enemyEncounters, args.roundEnemy?.templateId)}
      />
    ),
    handNode: (
      <Hand
        hand={args.game.player.hand}
        cards={args.game.cards}
        dragLocked={args.dragLocked}
        display={
          args.game.round?.equation.shape === "find-missing-result" ? "ten-frame" : "numeric"
        }
        onSwap={args.handleSwap}
      />
    ),
    playerAvatarNode: (
      <PlayerAvatar
        key={args.currentPlayer?.id ?? "no-pilot"}
        player={args.currentPlayer}
        profileIndex={args.currentPlayer && args.currentIndex >= 0 ? args.currentIndex + 1 : null}
        profileCount={args.currentPlayer ? PLAYER_REGISTRY.length : null}
        onCycle={args.currentPlayer ? args.handleCyclePlayer : null}
        progress={args.currentProgress}
        xpThreshold={args.currentXpThreshold}
      />
    ),
  };
}

// ─── Component ────────────────────────────────────────────────────────────

// KEEP — `AddingGame` is the route's mount point, called by Route's
// `component:` config above. Exporting it would expose internals; moving
// it to its own file would force every co-located game-state hook to
// move with it (they're its private bookkeeping). At 343 lines it's
// over react-doctor's threshold, but extracting chunks further would
// fragment the round-by-round state machine in ways that hurt local
// reasoning more than they help.
// react-doctor-disable-next-line react-doctor/only-export-components react-doctor/no-giant-component
function AddingGame() {
  const game = useAtomValue(addingGameAtom);
  const setGame = useSetAtom(addingGameAtom);
  const sfx = useSound();
  useAutoplayCharacterNames(game, sfx);

  // The dive-in intro is a STATE, not a default. Three explicit phases:
  //   - splash       (status idle, round null, intro not playing)
  //   - introPlaying (DiveInIntro mounted, plays for 8s)
  //   - in-game      (round populated, normal UI)
  //   - victory      (status ended)
  //
  // The kid clicks "Begin" on splash → intro plays → first deal happens
  // in the intro's onComplete. Play Again from victory short-circuits
  // splash and goes straight to intro. Returning to a saved mid-game
  // skips both — the round is already populated so the game UI shows.
  const [introPlaying, setIntroPlaying] = useState(false);

  const { celebration, clear: clearCelebration } = useGameCelebration(
    game.round?.index,
    game.status,
    ENABLE_PIXI_FX,
  );
  const crystalPullNode = useCrystalPullSession(game, setGame, celebration !== null);
  const bubbleBurstNode = useBubbleBurstFx(game);
  const { hint, dismiss: dismissHint } = useGameHints(game);

  // Begin: kid clicked "Begin" on splash. Mount the dive-in; the deal
  // happens in handleIntroComplete so the cards appear UNDER the intro
  // as it fades.
  // Intro complete: tear down the overlay, deal level 1. setGame guards
  // against double-deal on StrictMode rerun.
  const handleIntroComplete = (): void => {
    setIntroPlaying(false);
    setGame((prev) => {
      if (prev.round) return prev;
      const result = dealRound({ levelIndex: 1 });
      return {
        ...prev,
        status: "playing",
        cards: result.cards,
        player: { ...prev.player, hand: result.hand },
        round: result.round,
      };
    });
  };

  const handleBegin = (): void => {
    if (ENABLE_PIXI_FX) {
      setIntroPlaying(true);
      return;
    }
    handleIntroComplete();
  };

  const handleSwap = (source: SlotLocator, target: SlotLocator): void => {
    setGame((prev) => applySwap(prev, source, target));
  };

  const handleStep = useGameStepper(setGame);

  const handleChooseProduct = useFindProductChooseHandler(setGame, sfx);

  // R16 per-round state (chant mastery + rooftop prompt). Lives in
  // the component for V1 — not IDB-persisted, so a mid-row reload
  // restarts the floor. Most chant rows clear in < 30s so the cost
  // is small. Persisting requires schema work + tests; deferred.
  const r16 = useR16State(game, setGame, sfx);

  const handleEvaluate = useEvaluateHandler(setGame, sfx);

  // Continue: kill enemy / advance level / re-deal. Logic lives in the
  // pure continueAfterWin transition above. dealRound's Math.random is
  // called inside the transition, but setGame is invoked once with the
  // resolved state — React strict-mode-safe.
  const handleContinue = (): void => {
    const next = continueAfterWin(game);
    if (next) setGame(() => next);
  };

  const { attackPending, runAttack: handleAttack } = useAttackFlow(
    game,
    sfx,
    handleContinue,
    ENABLE_PIXI_FX,
  );

  // Play Again from victory — wipe to idle AND fire the intro. The kid
  // sees the same descent as their first dive, then a fresh round 1.
  const handlePlayAgain = (): void => {
    setGame((prev) => resetToIdle(prev));
    setIntroPlaying(true);
  };

  // Drag rules:
  //   - no round                 → locked (between rounds, on victory)
  //   - won evaluation pending   → locked (Continue is the only way forward;
  //                                 dragging would clear the win via applySwap's
  //                                 auto-reset and discard the damage opportunity)
  //   - everything else          → unlocked (re-arrange and re-evaluate freely)
  const wonPending = game.round?.outcome?.won === true;
  const dragLocked = !game.round || wonPending;

  const roundEnemy = game.round?.enemy ?? null;
  const enemyTemplate = roundEnemy ? (findEnemyTemplate(roundEnemy.templateId) ?? null) : null;
  const ended = game.status === "ended";
  // Title screen: no active round AND game hasn't ended → Splash is
  // showing. Used to drop the 4 surrounding panels' glass backgrounds
  // so the title sits over the bare water canvas (Center stays
  // glass-backed since that's where the Splash content lives).
  const isSplash = !ended && !game.round;

  // Player roster cycle + per-pilot XP — fully persisted in IDB via
  // `game.player.selectedPilotId` and `game.player.pilotProgress`. The
  // active pilot, their level, and their xp survive reload; switching
  // pilots reveals the OTHER pilot's stored progress (the first pilot's
  // is untouched).
  //
  // Same visibility contract as the enemy: the avatar is only "filled"
  // while a round is active. On splash, victory, or any between-round
  // null state the right column shows the dotted "No player yet" frame
  // so both columns breathe together.
  //
  // Default selection: when a round becomes active and `selectedPilotId`
  // is null (fresh save), write roster[0] in. The effect runs once per
  // dive — subsequent rounds re-enter with selectedPilotId already set.
  useEffect(() => {
    if (!game.round) return;
    if (game.player.selectedPilotId) return;
    const first = PLAYER_REGISTRY[0];
    if (!first) return;
    setGame((prev) => {
      if (prev.player.selectedPilotId) return prev;
      return { ...prev, player: { ...prev.player, selectedPilotId: first.id } };
    });
  }, [game.round, game.player.selectedPilotId, setGame]);

  const handleCyclePlayer = (): void => {
    setGame((prev) => {
      const currId = prev.player.selectedPilotId;
      const currIdx = currId ? PLAYER_REGISTRY.findIndex((p) => p.id === currId) : -1;
      const nextIdx = (Math.max(currIdx, -1) + 1) % PLAYER_REGISTRY.length;
      const next = PLAYER_REGISTRY[nextIdx];
      if (!next) return prev;
      return { ...prev, player: { ...prev.player, selectedPilotId: next.id } };
    });
  };

  // Resolve the currently-displayed pilot. Fall back to roster[0] for the
  // first paint between round-becomes-non-null and the default-id effect
  // committing — keeps the avatar from flashing the empty frame for one
  // render.
  const selectedPilotId = game.player.selectedPilotId;
  const currentPlayer = (() => {
    if (!game.round) return null;
    if (selectedPilotId) {
      return findPlayerTemplate(selectedPilotId) ?? PLAYER_REGISTRY[0] ?? null;
    }
    return PLAYER_REGISTRY[0] ?? null;
  })();
  const currentIndex = currentPlayer
    ? PLAYER_REGISTRY.findIndex((p) => p.id === currentPlayer.id)
    : -1;
  const currentProgress = currentPlayer
    ? progressFor(game.player.pilotProgress, currentPlayer.id)
    : null;
  const currentXpThreshold = currentProgress ? xpThresholdForLevel(currentProgress.level) : null;

  // Splash-gated panel children. All three nodes are bundled into one
  // helper call so AddingGame's body stays under react-doctor's
  // 300-line giant-component threshold.
  const { enemyAvatarNode, handNode, playerAvatarNode } = buildPanelChildren({
    isSplash,
    enemyTemplate,
    roundEnemy,
    game,
    dragLocked,
    handleSwap,
    currentPlayer,
    currentIndex,
    currentProgress,
    currentXpThreshold,
    handleCyclePlayer,
  });

  return (
    <>
      <DevMenu>
        <RoundJumpPanel />
      </DevMenu>
      <AttackFxLayer />
      {ENABLE_PIXI_FX && introPlaying ? (
        <Suspense fallback={null}>
          <DiveInIntro onComplete={handleIntroComplete} />
        </Suspense>
      ) : null}
      {ENABLE_PIXI_FX && celebration !== null ? (
        <Suspense fallback={null}>
          <RoundCompleteFx active fromRound={celebration.fromRound} onComplete={clearCelebration} />
        </Suspense>
      ) : null}
      {crystalPullNode}
      {bubbleBurstNode}
      <GameBoard
        ownedCrystals={game.crystals}
        waterCanvas={ENABLE_PIXI_FX ? <WaterCanvas /> : null}
      >
        <section
          aria-label="Left panel"
          className={`relative grid grid-rows-[1fr] rounded-lg p-3 animate-panel-fade-in ${isSplash ? "" : "panel-glass"}`}
        >
          {enemyAvatarNode}
        </section>
        <div className="flex min-h-0 flex-col gap-[18px] animate-panel-fade-in">
          <section
            aria-label="Top center panel"
            className={`relative h-[200px] shrink-0 rounded-lg ${isSplash ? "" : "panel-glass"}`}
          >
            {game.round ? (
              <div className="flex size-full items-center justify-between px-3">
                <RoundIndicator
                  key={roundOf(game.round.index)}
                  round={roundOf(game.round.index)}
                  levelIndex={game.round.index}
                  localLevel={localLevelIndex(game.round.index)}
                  tierLevelCount={levelsInRound(roundOf(game.round.index))}
                  totalLevels={FINAL_LEVEL_INDEX}
                />
                <MistakesBadge count={game.round.wrongAttempts ?? 0} />
                <CollectionBar ownedCrystals={[...game.crystals]} />
              </div>
            ) : null}
          </section>
          <section
            aria-label="Middle center panel"
            className="panel-glass relative min-h-0 flex-1 rounded-lg"
          >
            {/* Three-way render: victory > splash (no round) > active round.
                The third arm doesn't need its own ternary because the
                preceding `!game.round ?` is exhaustive — if we reach the
                else, game.round is truthy. */}
            {ended && <VictoryPanel onPlayAgain={handlePlayAgain} />}
            {!ended && !game.round && <GameSplash onBegin={handleBegin} />}
            {!ended && game.round && (
              <div className="flex h-full flex-col items-center justify-center gap-6 p-[18px]">
                <EquationView
                  equation={game.round.equation}
                  cards={game.cards}
                  dragLocked={dragLocked}
                  failedComputed={
                    game.round.outcome && !game.round.outcome.won
                      ? game.round.outcome.computedValue
                      : null
                  }
                  onSwap={handleSwap}
                  onStep={handleStep}
                  onChooseProduct={handleChooseProduct}
                  r16Multiplier={r16.multiplier}
                  r16MasteredSteps={r16.masteredSteps}
                  onChantStepMastered={r16.onChantStepMastered}
                  r16Prompt={r16.prompt}
                  onRooftopCellTap={r16.onRooftopCellTap}
                />
                {/* Action area — relative wrapper so the hint can overlay
                    the button without affecting layout. The hint covers
                    the button + result while it's up so the kid HAS to
                    read it before clicking Evaluate again. Cards in
                    Bottom remain draggable throughout. */}
                <div className="relative flex w-full justify-center">
                  <GameActionButton
                    outcome={game.round.outcome}
                    attacks={currentPlayer?.attacks ?? null}
                    canEvaluate={
                      // R12 true-false-multiply: only the verdict slot needs
                      // a card; operandSlots are pre-filled. R9–R11 stepper-
                      // sum and R13/R14 find-*-factor shapes: stepper card
                      // always has a value, so always evaluable. R15
                      // find-product auto-evaluates on choice tap so the
                      // Evaluate button is irrelevant — disabled is fine
                      // (the kid commits via the choice row, not the
                      // button). Everywhere else: every droppable operand
                      // slot must be full.
                      game.round.equation.shape === "true-false-multiply"
                        ? game.round.equation.verdictSlot?.cardId != null
                        : game.round.equation.shape === "stepper-sum" ||
                          game.round.equation.shape === "find-missing-factor" ||
                          game.round.equation.shape === "find-leading-factor" ||
                          game.round.equation.operandSlots.every((s) => s.cardId !== null)
                    }
                    onEvaluate={handleEvaluate}
                    onAttack={handleAttack}
                    attackPending={attackPending}
                  />
                  {hint ? (
                    <div
                      className="absolute inset-x-0 -top-2 z-20 flex justify-center"
                      data-test="hint-overlay"
                    >
                      <div className="w-full max-w-lg px-4">
                        <HintTooltip
                          emphasis={hint.emphasis}
                          body={hint.body}
                          // The failure chip lives INSIDE the tooltip. Only
                          // populated on a loss outcome — it pairs the
                          // failed math with the explanation in one card.
                          failedResult={
                            game.round?.outcome && !game.round.outcome.won
                              ? {
                                  computed: game.round.outcome.computedValue,
                                  expected: game.round.outcome.expectedValue,
                                }
                              : null
                          }
                          // Finger-counting visual, when the hint generator
                          // attached one. Most "count to N" hints carry
                          // hands; direction / encouragement hints don't.
                          hands={hint.hands ?? null}
                          onDismiss={dismissHint}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </section>
          <section
            aria-label="Bottom center panel"
            className={`relative h-[200px] shrink-0 rounded-lg ${isSplash ? "" : "panel-glass"}`}
          >
            <div className="grid h-full grid-cols-5 gap-[18px] p-[18px]">{handNode}</div>
          </section>
        </div>
        <section
          aria-label="Right panel"
          className={`relative grid grid-rows-[1fr] rounded-lg p-3 animate-panel-fade-in ${isSplash ? "" : "panel-glass"}`}
        >
          {playerAvatarNode}
        </section>
      </GameBoard>
    </>
  );
}
