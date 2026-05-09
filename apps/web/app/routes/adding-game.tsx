import {
  type AddingGameState,
  type Attack,
  type CardCatalog,
  type Comparator,
  type Equation as EquationData,
  HAND_SIZE,
  type HandSlot,
  type Operator,
  PLAYER_DEFAULT,
  type RoundOutcome,
} from "@dean-stack/schemas";
import { createFileRoute } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { ArrowRight, Check } from "lucide-react";
import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";

import { AttackButton } from "~/components/attack-button";
import { Card } from "~/components/card";
import { DevMenu } from "~/components/dev-menu";
import { DiveInIntro } from "~/components/dive-in-intro";
import { EnemyAvatar } from "~/components/enemy-avatar";
import { HintTooltip } from "~/components/hint-tooltip";
import { PlayerAvatar } from "~/components/player-avatar";
import { RoundCompleteFx } from "~/components/round-complete-fx";
import { RoundIndicator } from "~/components/round-indicator";
import { RoundJumpPanel } from "~/components/round-jump-panel";
import { AttackFxLayer } from "~/games/adding-game/attack-fx/layer";
import { attackFxRuntime } from "~/games/adding-game/attack-fx/runtime";
import { applyAutoAssist } from "~/games/adding-game/auto-assist";
import { dealRound } from "~/games/adding-game/deal";
import { DraggableCard, EmptySlot, SlotWrapper } from "~/games/adding-game/drag";
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
import { applySwap, type SlotLocator } from "~/games/adding-game/swap";
import { applyXpGain, progressFor, xpThresholdForLevel } from "~/games/adding-game/xp";
import { buildSeoLinks, buildSeoMeta } from "~/lib/seo";
import { addingGameAtom } from "~/state/atoms";

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

type RegionProps = { children?: ReactNode };

function GameBoard({ children }: RegionProps) {
  // `select-none` + iOS callout suppression: a long-press on a number / "+"
  // glyph would otherwise trigger Safari's text-selection magnifier or copy
  // menu and eat the pointer events the drag system is listening for.
  return (
    <main className="grid h-dvh grid-cols-[1fr_2fr_1fr] gap-[18px] p-[18px] font-openrunde select-none [-webkit-touch-callout:none] [-webkit-user-select:none]">
      {children}
    </main>
  );
}

function LeftCol({ children }: RegionProps) {
  return (
    <section
      aria-label="Left panel"
      className="relative grid grid-rows-[1fr] rounded-lg bg-light-gray p-3 animate-panel-fade-in"
    >
      {children}
    </section>
  );
}

function GameMain({ children }: RegionProps) {
  return <div className="flex min-h-0 flex-col gap-[18px] animate-panel-fade-in">{children}</div>;
}

function Top({ children }: RegionProps) {
  return (
    <section
      aria-label="Top center panel"
      className="relative h-[200px] shrink-0 rounded-lg bg-light-gray"
    >
      {children}
    </section>
  );
}

function Center({ children }: RegionProps) {
  return (
    <section
      aria-label="Middle center panel"
      className="relative min-h-0 flex-1 rounded-lg bg-light-gray"
    >
      {children}
    </section>
  );
}

function Bottom({ children }: RegionProps) {
  return (
    <section
      aria-label="Bottom center panel"
      className="relative h-[200px] shrink-0 rounded-lg bg-light-gray"
    >
      <div className="grid h-full grid-cols-5 gap-[18px] p-[18px]">{children}</div>
    </section>
  );
}

function RightCol({ children }: RegionProps) {
  return (
    <section
      aria-label="Right panel"
      className="relative grid grid-rows-[1fr] rounded-lg bg-light-gray p-3 animate-panel-fade-in"
    >
      {children}
    </section>
  );
}

function Hand({
  hand,
  cards,
  dragLocked,
  display,
  onSwap,
}: {
  hand: readonly HandSlot[];
  cards: CardCatalog;
  dragLocked: boolean;
  // R5/R6 pass "ten-frame" so the kid's hand cards render as the 2×5
  // grid the math-ed worksheets use. R1–R4 stay on the numeric default.
  // Explicit `| undefined` matches strict exactOptionalPropertyTypes.
  display?: "numeric" | "ten-frame" | undefined;
  onSwap: (source: SlotLocator, target: SlotLocator) => void;
}) {
  return (
    <>
      {hand.map((slot) => {
        const card = slot.cardId ? cards[slot.cardId] : undefined;
        return (
          <SlotWrapper key={slot.id} kind="hand" slotId={slot.id}>
            <EmptySlot />
            {card ? (
              <DraggableCard
                key={card.id}
                locator={{ kind: "hand", id: slot.id }}
                cardId={card.id}
                value={card.value}
                display={display}
                dragLocked={dragLocked}
                onSwap={onSwap}
              />
            ) : null}
          </SlotWrapper>
        );
      })}
    </>
  );
}

const OPERATOR_GLYPH: Record<Operator, string> = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
};

const COMPARATOR_GLYPH: Record<Comparator, string> = {
  eq: "=",
  gt: ">",
  lt: "<",
};

// Operator pill — circular, OpenRunde, white card with border + subtle
// shadow. Sized so it never overlaps the operand slots: the equation
// row's `gap-[28px]` leaves enough breathing room around a 56px pill.
//
// The pulse animation fires when the glyph CHANGES between deals: the
// component runs `op-out` (fade + scale-down + lift) for 200ms, swaps
// the displayed glyph, then runs `op-in` (drop + scale-up + fade-in)
// for 280ms. Total ~480ms — the kid's eye catches the operator shift
// before they start picking cards. CSS keyframes are owned by
// `data-phase` so the animation is driven purely by attribute changes.
function OperatorPill({ glyph }: { glyph: string }) {
  const [displayed, setDisplayed] = useState(glyph);
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");

  useEffect(() => {
    if (glyph === displayed) return;
    setPhase("out");
    const t1 = window.setTimeout(() => {
      setDisplayed(glyph);
      setPhase("in");
    }, 200);
    const t2 = window.setTimeout(() => setPhase("idle"), 200 + 280);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [glyph, displayed]);

  return (
    <span
      className="flex h-14 w-14 shrink-0 select-none items-center justify-center rounded-full border-2 border-light-gray bg-canvas-white font-openrunde text-3xl font-bold text-slate-ink shadow-subtle data-[phase=in]:animate-op-in data-[phase=out]:animate-op-out"
      data-phase={phase}
      data-test="operator-pill"
    >
      {displayed}
    </span>
  );
}

function EquationView({
  equation,
  cards,
  dragLocked,
  onSwap,
}: {
  equation: EquationData;
  cards: CardCatalog;
  dragLocked: boolean;
  onSwap: (source: SlotLocator, target: SlotLocator) => void;
}) {
  // ── find-missing-result (R5–R6) ────────────────────────────────────
  // 3-slot layout: [LHS-1] op [LHS-2] = [result]. One of LHS-1/LHS-2 is
  // locked + pre-filled with the static; the other LHS slot AND the
  // result slot are kid-droppable. The locked slot renders a non-
  // draggable Card (variant="target", disabled) so it visually reads as
  // the same affordance the kid is already used to from the find-sum
  // RHS — "this number is given to you."
  //
  // Every card here renders as a ten-frame so the kid SEES dot patterns
  // instead of digits — the SHAPE of the count is the lesson.
  if (equation.shape === "find-missing-result") {
    const [op0, op1, opResult] = equation.operandSlots;
    if (!op0 || !op1 || !opResult) {
      throw new Error("EquationView: find-missing-result needs 3 operandSlots");
    }
    return (
      <div
        className="flex items-center justify-center gap-[28px]"
        data-test="equation"
        data-shape="find-missing-result"
      >
        <DropOrLockedSlot
          slot={op0}
          cards={cards}
          dragLocked={dragLocked}
          display="ten-frame"
          onSwap={onSwap}
        />
        <OperatorPill glyph={OPERATOR_GLYPH[equation.operator]} />
        <DropOrLockedSlot
          slot={op1}
          cards={cards}
          dragLocked={dragLocked}
          display="ten-frame"
          onSwap={onSwap}
        />
        <OperatorPill glyph="=" />
        <DropOrLockedSlot
          slot={opResult}
          cards={cards}
          dragLocked={dragLocked}
          display="ten-frame"
          onSwap={onSwap}
        />
      </div>
    );
  }

  // ── find-sum (R1–R4) ───────────────────────────────────────────────
  // gap bumped 18 → 28 so the 56px operator pill never crowds an empty
  // slot's dotted-ring hover state. The slots are 100px wide; with the
  // larger gap, the pill sits in clear air on both sides.
  return (
    <div
      className="flex items-center justify-center gap-[28px]"
      data-test="equation"
      data-shape="find-sum"
    >
      {equation.operandSlots.map((slot, idx) => {
        const card = slot.cardId ? cards[slot.cardId] : undefined;
        return (
          <Fragment key={slot.id}>
            <div className="h-[140px] w-[100px] shrink-0">
              <SlotWrapper kind="equation" slotId={slot.id}>
                <EmptySlot />
                {card ? (
                  <DraggableCard
                    key={card.id}
                    locator={{ kind: "equation", id: slot.id }}
                    cardId={card.id}
                    value={card.value}
                    dragLocked={dragLocked}
                    onSwap={onSwap}
                  />
                ) : null}
              </SlotWrapper>
            </div>
            {idx < equation.operandSlots.length - 1 ? (
              <OperatorPill glyph={OPERATOR_GLYPH[equation.operator]} />
            ) : null}
          </Fragment>
        );
      })}
      <OperatorPill glyph={COMPARATOR_GLYPH[equation.comparator ?? "eq"]} />
      <div className="h-[140px] w-[100px] shrink-0">
        <Card value={equation.target?.value ?? 0} variant="target" disabled />
      </div>
    </div>
  );
}

// One slot in the find-missing-result layout. Locked → display-only Card
// (the static); unlocked → standard SlotWrapper + DraggableCard pattern.
function DropOrLockedSlot({
  slot,
  cards,
  dragLocked,
  display,
  onSwap,
}: {
  slot: { id: string; cardId: string | null; locked: boolean };
  cards: CardCatalog;
  dragLocked: boolean;
  // R5/R6 pass "ten-frame"; R1–R4 don't render this component (find-sum
  // shape uses the inline 2-slot layout above). Explicit `| undefined`
  // matches strict exactOptionalPropertyTypes.
  display?: "numeric" | "ten-frame" | undefined;
  onSwap: (source: SlotLocator, target: SlotLocator) => void;
}) {
  const card = slot.cardId ? cards[slot.cardId] : undefined;
  if (slot.locked) {
    return (
      <div
        className="h-[140px] w-[100px] shrink-0"
        data-test="equation-slot"
        data-slot-locked="true"
      >
        <Card value={card?.value ?? 0} variant="target" display={display} disabled />
      </div>
    );
  }
  return (
    <div className="h-[140px] w-[100px] shrink-0" data-test="equation-slot">
      <SlotWrapper kind="equation" slotId={slot.id}>
        <EmptySlot />
        {card ? (
          <DraggableCard
            key={card.id}
            locator={{ kind: "equation", id: slot.id }}
            cardId={card.id}
            value={card.value}
            display={display}
            dragLocked={dragLocked}
            onSwap={onSwap}
          />
        ) : null}
      </SlotWrapper>
    </div>
  );
}

// Crossed-swords glyph for the post-win Attack button. Inline SVG (Lucide
// "swords"-style) so we don't take an icon-package dependency for a single
// glyph. `currentColor` lets the button's text color drive both blades.
function CrossedSwordsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
      <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
      <line x1="5" y1="14" x2="9" y2="18" />
      <line x1="7" y1="17" x2="4" y2="20" />
      <line x1="3" y1="19" x2="5" y2="21" />
    </svg>
  );
}

// Shows for 3 seconds above the disabled Evaluate button, then unmounts.
// The keyframe handles the visual lifecycle (fade-in, gentle pulse, fade-
// out); the React timer drives the actual mount/unmount so a second tap
// while the prompt is up resets it (the parent re-keys this component on
// every disabled tap).
function FillPrompt({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 3000);
    return () => window.clearTimeout(t);
  }, [onDone]);
  return (
    <div
      role="status"
      className="pointer-events-none absolute -top-12 left-1/2 z-20 -translate-x-1/2 animate-fill-prompt rounded-full bg-vivid-orange px-4 py-1.5 font-openrunde text-sm font-bold whitespace-nowrap text-white shadow-lg"
      data-test="fill-prompt"
    >
      Fill out the board!
    </div>
  );
}

function ActionButton({
  outcome,
  attacks,
  canEvaluate,
  onEvaluate,
  onAttack,
  attackPending,
}: {
  outcome: RoundOutcome | null;
  // Three attacks for the active pilot. When `null`, the button falls back
  // to a single legacy "Attack" button (no pilot selected — shouldn't
  // happen during a real run, but keeps the UI safe).
  attacks: readonly [Attack, Attack, Attack] | null;
  // True iff every operandSlot in the round's equation has a card —
  // covers find-sum (both operands) and find-missing-result (kid's
  // operand AND result; static is always pre-filled). False → the
  // Evaluate button visually mutes, the click handler shakes the
  // button and shows the "Fill out the board!" prompt instead of
  // running the evaluator.
  canEvaluate: boolean;
  onEvaluate: () => void;
  onAttack: (attack: Attack | null) => void;
  // True between attack-click and animation completion. Disables every
  // attack button so the kid can't double-fire.
  attackPending: boolean;
}) {
  // Disabled-tap feedback. `shake` flips true on a disabled tap and
  // clears 500ms later (matches the damage-shake keyframe duration);
  // re-tapping during a shake re-triggers via the toggle. `promptKey`
  // remounts <FillPrompt> on every disabled tap so the 3s lifecycle
  // restarts even if the kid taps repeatedly.
  const [shake, setShake] = useState(false);
  const [promptKey, setPromptKey] = useState(0);
  useEffect(() => {
    if (!shake) return;
    const t = window.setTimeout(() => setShake(false), 500);
    return () => window.clearTimeout(t);
  }, [shake]);
  const handleEvaluateClick = (): void => {
    if (canEvaluate) {
      onEvaluate();
      return;
    }
    setShake(false);
    // Force a fresh truthy → true transition on the next tick so the
    // CSS animation re-fires (CSS only re-runs a keyframe when the
    // animation rule transitions from absent to present).
    requestAnimationFrame(() => setShake(true));
    setPromptKey((k) => k + 1);
  };
  // Two visual states:
  //   - default / loss : "Evaluate" — re-evaluates the current arrangement
  //   - won            : 3 attack-choice buttons — kid picks an attack,
  //                       its Pixi animation plays, then onAttack chains
  //                       through to the same continue/advance logic.
  const won = outcome?.won === true;
  // On a win, the row of three attack cards + the green math summary live
  // INSIDE a recessed "well" — slightly darker bg, inset shadow, rounded.
  // The well makes the win-state read as a distinct mode (you committed
  // a successful equation; now choose the strike) rather than the
  // attacks floating loose over the Center panel. The well is width-
  // constrained (max-w-[640px]) so it never bleeds past the Center
  // column on a wide iPad. The pre-win Evaluate button sits unwelled —
  // it's a single round button and a well around it would feel heavy.
  // CLS reservation: the wrapper holds either the Evaluate button (~52px)
  // or the win-state well (~152px — 24 well-pt + 80 attack-card + 8 gap +
  // 20 result line + 8 well-pb + a couple px slack). Lock min-h to the
  // taller of the two so the equation row above doesn't slide up when
  // the win state mounts. The unused space in Evaluate-state is absorbed
  // by `items-center` on this row, so the button stays vertically centered.
  return (
    <div className="flex w-full flex-col items-center gap-3" data-test="action-button">
      <div className="flex min-h-[160px] w-full items-center justify-center">
        {won ? (
          attacks ? (
            <div className="flex w-full max-w-[640px] flex-col items-stretch gap-2 rounded-lg border border-light-gray bg-canvas-white px-3 pt-6 pb-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.08)]">
              <div className="flex items-stretch justify-center gap-2">
                {attacks.map((attack) => (
                  <AttackButton
                    key={attack.id}
                    attack={attack}
                    damage={outcome?.scoreEarned ?? 0}
                    onSelect={onAttack}
                    pending={attackPending}
                  />
                ))}
              </div>
              {outcome ? (
                <div
                  className="flex items-center justify-center gap-2 font-openrunde text-sm font-bold text-success-green"
                  data-test="evaluation-result"
                  data-outcome="win"
                  aria-live="polite"
                >
                  <span>{outcome.computedValue}</span>
                  <span aria-hidden>=</span>
                  <span>{outcome.expectedValue}</span>
                  <Check size={16} strokeWidth={3} aria-hidden />
                  <span>−{outcome.scoreEarned} HP</span>
                </div>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAttack(null)}
              className="flex items-center gap-2 rounded-full bg-radiant-violet px-8 py-3 font-bold text-white shadow-subtle transition-transform duration-150 hover:scale-[1.04] active:scale-95"
              data-test="attack-button"
            >
              <CrossedSwordsIcon />
              <span>Attack!</span>
            </button>
          )
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={handleEvaluateClick}
              className={
                canEvaluate
                  ? "rounded-full bg-radiant-violet px-8 py-3 font-bold text-white shadow-subtle transition-transform duration-150 hover:scale-[1.04] active:scale-95 data-[shake=true]:animate-damage-shake"
                  : "cursor-not-allowed rounded-full bg-muted-gray/60 px-8 py-3 font-bold text-white/85 shadow-subtle data-[shake=true]:animate-damage-shake"
              }
              data-test="evaluate-button"
              data-can-evaluate={canEvaluate ? "true" : "false"}
              data-shake={shake ? "true" : undefined}
              aria-disabled={!canEvaluate}
            >
              Evaluate
            </button>
            {promptKey > 0 ? <FillPrompt key={promptKey} onDone={() => setPromptKey(0)} /> : null}
          </div>
        )}
      </div>
    </div>
  );
}

// The empty state the kid sees on a fresh visit before they've started a
// game. Replaces the "no enemy yet" stuck-look with a deliberate Begin
// affordance — clicking it triggers the dive-in animation, which fades
// out into the first round. The lore-fragment text sets the mood before
// the descent (8s of marine snow + light shafts) does the rest.
function Splash({ onBegin }: { onBegin: () => void }) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-8 px-8 text-center"
      data-test="splash"
    >
      <div className="flex flex-col items-center gap-2">
        <p className="font-openrunde text-xs font-semibold uppercase tracking-[0.3em] text-muted-gray">
          The trench is waiting
        </p>
        <h2 className="font-openrunde text-5xl font-bold text-slate-ink">Hadal Tide</h2>
        <p className="max-w-md text-base text-medium-gray">
          The echoes are confused. They've been counting in the dark for a long time. Help them
          remember.
        </p>
      </div>
      <button
        type="button"
        onClick={onBegin}
        className="flex items-center gap-2 rounded-full bg-radiant-violet px-10 py-4 font-openrunde text-xl font-bold text-white shadow-subtle transition-transform duration-150 hover:scale-[1.04] active:scale-95"
        data-test="splash-begin"
      >
        <span>Begin the descent</span>
        <ArrowRight size={22} strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}

// Small chip in the Top region beside the RoundIndicator. Surfaces the
// running count of losing evaluations on the CURRENT stage so the kid can
// see their own try count climb. Hidden until the kid has missed once —
// a constant "Mistakes: 0" would just be noise.
//
// At wrongAttempts >= 3 the find-missing-result auto-assist has fired
// (one card pre-placed + locked); the badge tilts into a warmer "helped"
// styling so the kid notices the equation just got easier.
function MistakesBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const helped = count >= 3;
  return (
    <div
      role="status"
      className={
        helped
          ? "flex items-center gap-1.5 rounded-full bg-vivid-orange/15 px-3 py-1 font-openrunde text-sm font-bold text-vivid-orange"
          : "flex items-center gap-1.5 rounded-full bg-light-gray px-3 py-1 font-openrunde text-sm font-semibold text-medium-gray"
      }
      data-test="mistakes-badge"
      data-mistakes={count}
      data-helped={helped ? "true" : undefined}
      aria-label={`Mistakes this stage: ${count}`}
    >
      <span aria-hidden>✕</span>
      <span>{count}</span>
    </div>
  );
}

function VictoryPanel({ onPlayAgain }: { onPlayAgain: () => void }) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-6 p-[18px] text-center"
      data-test="victory-panel"
    >
      <h2 className="font-openrunde text-4xl font-bold text-slate-ink">The trench is calm.</h2>
      <p className="max-w-md text-lg text-medium-gray">
        You sent every wraith back to sleep. The Hadal Tide remembers your kindness.
      </p>
      <button
        type="button"
        onClick={onPlayAgain}
        className="rounded-full bg-radiant-violet px-8 py-3 font-bold text-white shadow-subtle transition-transform duration-150 hover:scale-[1.04] active:scale-95"
        data-test="play-again-button"
      >
        Dive again
      </button>
    </div>
  );
}

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

// ─── Component ────────────────────────────────────────────────────────────

function AddingGame() {
  const game = useAtomValue(addingGameAtom);
  const setGame = useSetAtom(addingGameAtom);

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

  // Round-complete celebration — fires when the player crosses ANY round
  // boundary (defeats the last enemy of round 1/2/3, or completes round 4).
  // ROUND_BOUNDARIES holds the last level index of each round; if the
  // previous level matched any of those AND we advanced past it, fire the
  // celebration with the round number that was just completed. The
  // celebration component renders the "Round N → Round N+1" text.
  const [celebration, setCelebration] = useState<null | {
    fromRound: 1 | 2 | 3 | 4 | 5 | 6;
  }>(null);
  const prevLevelRef = useRef<number | null>(game.round?.index ?? null);
  useEffect(() => {
    const curr = game.round?.index ?? null;
    const prev = prevLevelRef.current;
    prevLevelRef.current = curr;
    if (prev == null) return;
    const isBoundary = ROUND_BOUNDARIES.includes(prev);
    if (!isBoundary) return;
    const advanced = curr != null && curr > prev;
    const completed = prev === FINAL_LEVEL_INDEX && (curr == null || game.status === "ended");
    if (advanced || completed) {
      setCelebration({ fromRound: roundOf(prev) });
    }
  }, [game.round?.index, game.status]);

  useEffect(() => {
    if (game.status === "ended" && prevLevelRef.current === FINAL_LEVEL_INDEX) {
      setCelebration({ fromRound: 6 });
    }
  }, [game.status]);

  // Hint banner — appears in Top when an evaluation is wrong, dismisses
  // on (a) 8s timeout, (b) tap, (c) any state change that nulls outcome
  // (a drag, a Continue, a Play Again — `applySwap` already auto-resets
  // `phase: matching` and `outcome: null` on every drag).
  const [hint, setHint] = useState<Hint | null>(null);
  // Avoid showing the same id back-to-back so consecutive losses see fresh
  // framing. Stored across renders without triggering a re-render.
  const lastHintIdRef = useRef<string | null>(null);
  // Tracks the outcome-object identity from the previous run. The effect
  // depends on `game` (per react-hooks exhaustive-deps), so it fires on
  // every drag — but real "outcome changed" transitions are detected by
  // ref equality here, and unchanged-outcome runs early-return cheap.
  const prevOutcomeRef = useRef<RoundOutcome | null>(null);

  useEffect(() => {
    const outcome = game.round?.outcome ?? null;
    if (outcome === prevOutcomeRef.current) return;
    prevOutcomeRef.current = outcome;

    if (!outcome || outcome.won) {
      setHint(null);
      return;
    }
    const hints = generateHints(game);
    const next = pickRandomHint(hints, lastHintIdRef.current);
    if (!next) return;
    lastHintIdRef.current = next.id;
    setHint(next);
    // No auto-timeout: the hint stays until the kid touches a card OR taps
    // the tooltip itself (handled separately below). Forcing a deliberate
    // dismissal makes him notice the help instead of waiting it out.
  }, [game]);

  // Card-touch dismissal — while a hint is up, ANY pointerdown on a card
  // (hand or equation) clears it. Drag/swap normally clears outcome which
  // would also clear the hint, but the kid often presses a card before
  // committing a swap; dismissing on press keeps the tooltip from
  // hovering over the cards he's about to move.
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

  // Begin: kid clicked "Begin" on splash. Mount the dive-in; the deal
  // happens in handleIntroComplete so the cards appear UNDER the intro
  // as it fades.
  const handleBegin = (): void => {
    setIntroPlaying(true);
  };

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

  const handleSwap = (source: SlotLocator, target: SlotLocator): void => {
    setGame((prev) => applySwap(prev, source, target));
  };

  const handleEvaluate = (): void => {
    setGame((prev) => {
      if (!prev.round) return prev;
      const stillOutcome = evaluateRound(prev);
      if (!stillOutcome) return prev;

      // Wins don't advance wrongAttempts. The setter only writes the
      // outcome and the route's win-flow takes over from there.
      if (stillOutcome.won) {
        return {
          ...prev,
          round: { ...prev.round, phase: "evaluating", outcome: stillOutcome },
        };
      }

      // Loss path. Increment the per-stage counter; the EXACT 2 → 3
      // transition triggers the find-missing-result auto-assist (the
      // assist scans the kid's hand + slots, places ONE correct card,
      // and locks it). Subsequent losses keep the counter climbing
      // but `applyAutoAssist` is gated by which slot is still unlocked
      // — the second pass (count = 6th wrong) places the result; a
      // third pass returns null because both kid-slots are locked.
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

      // Auto-assist: only for find-missing-result, only on the EXACT
      // 2 → 3 step (so we don't fire on every wrong attempt past 3).
      // To open the second assist (placing the result card) without a
      // separate UI trigger, fire again at 6 wrongs — same code path.
      const shouldAssist =
        prev.round.equation.shape === "find-missing-result" &&
        (nextWrongAttempts === 3 || nextWrongAttempts === 6);
      if (!shouldAssist) return withOutcome;

      const assisted = applyAutoAssist(withOutcome);
      // applyAutoAssist returns null when no action is possible (e.g. both
      // kid-slots already locked). Fall back to the un-assisted state.
      return assisted ?? withOutcome;
    });
  };

  // While an attack's Pixi animation is in flight (≤500ms), every attack
  // button disables and Continue is gated. The kid picks ONE attack per
  // win — committing to a choice is the whole point of the 3-up UI.
  const [attackPending, setAttackPending] = useState(false);

  // Resolve the bounding rects (action button + enemy avatar) at click
  // time so the animation aims at the live layout. Falls back to viewport
  // center if either element is gone — shouldn't happen in normal play
  // but keeps the runtime from throwing on a hot reload mid-click.
  const fireAttackAnimation = async (attack: Attack): Promise<void> => {
    if (typeof document === "undefined") return;
    const fromEl = document.querySelector('[data-test="action-button"]');
    const toEl = document.querySelector('[data-test="enemy-avatar"]');
    const fromRect = fromEl?.getBoundingClientRect();
    const toRect = toEl?.getBoundingClientRect();
    if (!fromRect || !toRect) return;
    // Damage number flies in parallel with the Pixi animation. Both end
    // around the same time (≈540ms vs ≤500ms); the kid sees one cohesive
    // strike rather than two stacked beats.
    spawnDamageProjectile({
      text: `−${game.round?.outcome?.scoreEarned ?? 0}`,
      from: fromEl as Element,
      to: toEl as Element,
    });
    await attackFxRuntime.runAttack(
      attack,
      { x: fromRect.left, y: fromRect.top, width: fromRect.width, height: fromRect.height },
      { x: toRect.left, y: toRect.top, width: toRect.width, height: toRect.height },
    );
  };

  // Handle the attack tap: lock the row, run the FX, then advance state.
  // `attack === null` is the legacy fallback path (no pilot selected) —
  // skip the FX and continue straight through.
  const handleAttack = (attack: Attack | null): void => {
    if (attackPending) return;
    setAttackPending(true);
    const finish = (): void => {
      handleContinue();
      setAttackPending(false);
    };
    if (!attack) {
      finish();
      return;
    }
    void fireAttackAnimation(attack).then(finish, finish);
  };

  // Continue: only valid in "evaluating" phase with a winning outcome. Apply
  // damage, decide whether the enemy died, then either advance levels, end
  // the game, or re-deal within the current level. Compute the next state
  // OUTSIDE the setter so dealRound's Math.random isn't subject to React's
  // setter-may-call-twice semantics.
  const handleContinue = (): void => {
    const round = game.round;
    if (!round?.outcome?.won || !round.enemy) return;

    const damage = round.outcome.scoreEarned;
    const newHp = round.enemy.hp - damage;

    if (newHp <= 0) {
      // XP from this defeat = the equation's "win value":
      //   - find-sum levels (R1–R4): the equation target.
      //   - find-missing-result levels (R5–R6): the kid's chosen result
      //     card (lives at operandSlots[2]) — same number that drives
      //     `scoreEarned` in evaluate.ts.
      const xpGain = round.outcome.scoreEarned;
      const defeatedTemplateId = round.enemy.templateId;
      const nextLevelIndex = round.index + 1;
      if (nextLevelIndex > FINAL_LEVEL_INDEX) {
        // Game cleared — set status:ended, drop round, blank the hand. The
        // VictoryPanel will render. The gameStart effect deliberately
        // bails on status:ended so it doesn't immediately re-deal.
        setGame((prev) => {
          const pilotId = prev.player.selectedPilotId;
          const pilotProgress = pilotId
            ? {
                ...prev.player.pilotProgress,
                [pilotId]: applyXpGain(progressFor(prev.player.pilotProgress, pilotId), xpGain)
                  .next,
              }
            : prev.player.pilotProgress;
          return {
            ...prev,
            status: "ended",
            cards: {},
            player: { ...prev.player, hand: emptyHand(), pilotProgress },
            round: null,
            enemyEncounters: incrementEncounter(prev.enemyEncounters, defeatedTemplateId),
          };
        });
        return;
      }
      // Next enemy: dealRound seeds a fresh enemy at maxHp from the registry.
      const dealt = dealRound({ levelIndex: nextLevelIndex });
      setGame((prev) => {
        const pilotId = prev.player.selectedPilotId;
        const pilotProgress = pilotId
          ? {
              ...prev.player.pilotProgress,
              [pilotId]: applyXpGain(progressFor(prev.player.pilotProgress, pilotId), xpGain).next,
            }
          : prev.player.pilotProgress;
        return {
          ...prev,
          status: "playing",
          cards: dealt.cards,
          player: { ...prev.player, hand: dealt.hand, pilotProgress },
          round: dealt.round,
          enemyEncounters: incrementEncounter(prev.enemyEncounters, defeatedTemplateId),
        };
      });
      return;
    }

    // Same level, new equation/hand, **preserve damaged enemy**. The dealt
    // round comes back with a fresh-at-maxHp enemy from the registry; we
    // override `enemy.hp` with the post-damage value so the avatar's HP bar
    // reflects accumulated damage across cycles.
    const dealt = dealRound({ levelIndex: round.index });
    const damagedEnemy = { templateId: round.enemy.templateId, hp: newHp };
    setGame((prev) => ({
      ...prev,
      status: "playing",
      cards: dealt.cards,
      player: { ...prev.player, hand: dealt.hand },
      round: { ...dealt.round, enemy: damagedEnemy },
    }));
  };

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
  const currentPlayer = game.round
    ? selectedPilotId
      ? (findPlayerTemplate(selectedPilotId) ?? PLAYER_REGISTRY[0] ?? null)
      : (PLAYER_REGISTRY[0] ?? null)
    : null;
  const currentIndex = currentPlayer
    ? PLAYER_REGISTRY.findIndex((p) => p.id === currentPlayer.id)
    : -1;
  const currentProgress = currentPlayer
    ? progressFor(game.player.pilotProgress, currentPlayer.id)
    : null;
  const currentXpThreshold = currentProgress ? xpThresholdForLevel(currentProgress.level) : null;

  return (
    <>
      <DevMenu>
        <RoundJumpPanel />
      </DevMenu>
      <AttackFxLayer />
      {introPlaying ? <DiveInIntro onComplete={handleIntroComplete} /> : null}
      <RoundCompleteFx
        active={celebration !== null}
        fromRound={celebration?.fromRound ?? null}
        onComplete={() => setCelebration(null)}
      />
      <GameBoard>
        <LeftCol>
          <EnemyAvatar
            enemy={enemyTemplate}
            hp={roundEnemy?.hp ?? null}
            maxHp={game.round ? (findLevel(game.round.index)?.hp ?? null) : null}
            encounters={encountersFor(game.enemyEncounters, roundEnemy?.templateId)}
          />
        </LeftCol>
        <GameMain>
          <Top>
            {game.round ? (
              <div className="flex h-full w-full items-center justify-between px-3">
                <RoundIndicator
                  round={roundOf(game.round.index)}
                  levelIndex={game.round.index}
                  localLevel={localLevelIndex(game.round.index)}
                  tierLevelCount={levelsInRound(roundOf(game.round.index))}
                />
                <MistakesBadge count={game.round.wrongAttempts ?? 0} />
              </div>
            ) : null}
          </Top>
          <Center>
            {ended ? (
              <VictoryPanel onPlayAgain={handlePlayAgain} />
            ) : !game.round ? (
              <Splash onBegin={handleBegin} />
            ) : game.round ? (
              <div className="flex h-full flex-col items-center justify-center gap-6 p-[18px]">
                <EquationView
                  equation={game.round.equation}
                  cards={game.cards}
                  dragLocked={dragLocked}
                  onSwap={handleSwap}
                />
                {/* Action area — relative wrapper so the hint can overlay
                    the button without affecting layout. The hint covers
                    the button + result while it's up so the kid HAS to
                    read it before clicking Evaluate again. Cards in
                    Bottom remain draggable throughout. */}
                <div className="relative flex w-full justify-center">
                  <ActionButton
                    outcome={game.round.outcome}
                    attacks={currentPlayer?.attacks ?? null}
                    canEvaluate={game.round.equation.operandSlots.every((s) => s.cardId !== null)}
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
                          onDismiss={() => setHint(null)}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Center>
          <Bottom>
            <Hand
              hand={game.player.hand}
              cards={game.cards}
              dragLocked={dragLocked}
              display={
                game.round?.equation.shape === "find-missing-result" ? "ten-frame" : "numeric"
              }
              onSwap={handleSwap}
            />
          </Bottom>
        </GameMain>
        <RightCol>
          <PlayerAvatar
            player={currentPlayer}
            profileIndex={currentPlayer && currentIndex >= 0 ? currentIndex + 1 : null}
            profileCount={currentPlayer ? PLAYER_REGISTRY.length : null}
            onCycle={currentPlayer ? handleCyclePlayer : null}
            progress={currentProgress}
            xpThreshold={currentXpThreshold}
          />
        </RightCol>
      </GameBoard>
    </>
  );
}
