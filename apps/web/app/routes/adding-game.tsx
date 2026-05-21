import {
  type AddingGameState,
  type Attack,
  type CardCatalog,
  type Comparator,
  type CrystalId,
  type EnemyTemplate,
  type Equation as EquationData,
  HAND_SIZE,
  type HandSlot,
  type Operator,
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
import { ArrowRight, Check } from "lucide-react";
import {
  Fragment,
  lazy,
  type ReactNode,
  Suspense,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import { AttackButton } from "~/components/attack-button";
import { BubbleBurstFx } from "~/components/bubble-burst-fx";
import { Card } from "~/components/card";
import { CollectionBar } from "~/components/collection-bar";
import { CrystalEffectsLayer } from "~/components/crystal-effects-layer";
import { CrystalPullPanel } from "~/components/crystal-pull-panel";
import { DevMenu } from "~/components/dev-menu";
import { EnemyAvatar } from "~/components/enemy-avatar";
import { HintTooltip } from "~/components/hint-tooltip";
import { PlayerAvatar } from "~/components/player-avatar";
import { RoundIndicator } from "~/components/round-indicator";
import { RoundJumpPanel } from "~/components/round-jump-panel";
import { StepperCard } from "~/components/stepper-card";
import { SwipeToEvaluate } from "~/components/swipe-to-evaluate";
import { AttackFxLayer } from "~/games/adding-game/attack-fx/layer";
import { applyAutoAssist } from "~/games/adding-game/auto-assist";
import { buildPullOptions } from "~/games/adding-game/crystals";
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

const DiveInIntro = lazy(async () => {
  const { DiveInIntro: Component } = await import("~/components/dive-in-intro");
  return { default: Component };
});

const RoundCompleteFx = lazy(async () => {
  const { RoundCompleteFx: Component } = await import("~/components/round-complete-fx");
  return { default: Component };
});

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

// `transparent` (optional) drops the panel-glass background + shadow on
// LeftCol / Top / Bottom / RightCol — used by the splash screen so the
// 4 surrounding panels disappear and the title sits over the bare
// water canvas. The Center panel is excluded by design (the splash
// content lives there and still benefits from the glass surface).
type RegionProps = { children?: ReactNode; transparent?: boolean };

// Module-level so the GameBoard default-prop value is a stable reference
// across renders. A `prop = []` literal would create a fresh array each
// call, breaking identity-based memoization in any downstream consumer
// (react-doctor catches this exact shape).
const NO_OWNED_CRYSTALS: readonly CrystalId[] = [];

function GameBoard({
  children,
  ownedCrystals = NO_OWNED_CRYSTALS,
}: RegionProps & { ownedCrystals?: readonly CrystalId[] }) {
  // `select-none` + iOS callout suppression: a long-press on a number / "+"
  // glyph would otherwise trigger Safari's text-selection magnifier or copy
  // menu and eat the pointer events the drag system is listening for.
  //
  // Layering:
  //   - `water-bg` class on the <main> is the static CSS fallback (kicks
  //     in when WebGL is unavailable — headless tests, ancient devices —
  //     so the kid still sees an oceanic palette).
  //   - `<WaterCanvas />` mounts a Pixi shader on top of that fallback;
  //     when it's running, the shader paints over the CSS gradient.
  //   - `<CrystalEffectsLayer />` renders Tide-Sigil cosmetics (marine
  //     snow drift, caustic light pulse) in the SAME z-0 layer as the
  //     water. The kid sees them floating in the ocean, beneath the UI.
  //   - Grid children sit above the canvas via `relative z-10`. The
  //     panel surfaces use `panel-glass` so the water shows through the
  //     gaps AND subtly through the panels themselves (cards stay
  //     opaque on top).
  // Crystal-driven className list. Each owned crystal contributes a
  // `charm-<id>` class that CSS descendant selectors target — zero
  // prop-threading, any descendant can opt into a charm rule via the
  // selectors defined under "Card Charm crystal effects" in styles/index.css.
  const charmClasses = ownedCrystals.map((c) => `charm-${c}`).join(" ");
  return (
    <main
      className={`water-bg relative h-dvh font-openrunde select-none [-webkit-touch-callout:none] [-webkit-user-select:none] ${charmClasses}`}
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        {ENABLE_PIXI_FX ? (
          <Suspense fallback={null}>
            <WaterCanvas />
          </Suspense>
        ) : null}
        <CrystalEffectsLayer ownedCrystals={[...ownedCrystals]} />
      </div>
      <div className="relative z-10 grid h-full grid-cols-[1fr_2fr_1fr] gap-[18px] p-[18px]">
        {children}
      </div>
    </main>
  );
}

function LeftCol({ children, transparent }: RegionProps) {
  return (
    <section
      aria-label="Left panel"
      className={`relative grid grid-rows-[1fr] rounded-lg p-3 animate-panel-fade-in ${
        transparent ? "" : "panel-glass"
      }`}
    >
      {children}
    </section>
  );
}

function GameMain({ children }: RegionProps) {
  return <div className="flex min-h-0 flex-col gap-[18px] animate-panel-fade-in">{children}</div>;
}

function Top({ children, transparent }: RegionProps) {
  return (
    <section
      aria-label="Top center panel"
      className={`relative h-[200px] shrink-0 rounded-lg ${transparent ? "" : "panel-glass"}`}
    >
      {children}
    </section>
  );
}

function Center({ children }: RegionProps) {
  return (
    <section
      aria-label="Middle center panel"
      className="panel-glass relative min-h-0 flex-1 rounded-lg"
    >
      {children}
    </section>
  );
}

function Bottom({ children, transparent }: RegionProps) {
  return (
    <section
      aria-label="Bottom center panel"
      className={`relative h-[200px] shrink-0 rounded-lg ${transparent ? "" : "panel-glass"}`}
    >
      <div className="grid h-full grid-cols-5 gap-[18px] p-[18px]">{children}</div>
    </section>
  );
}

function RightCol({ children, transparent }: RegionProps) {
  return (
    <section
      aria-label="Right panel"
      className={`relative grid grid-rows-[1fr] rounded-lg p-3 animate-panel-fade-in ${
        transparent ? "" : "panel-glass"
      }`}
    >
      {children}
    </section>
  );
}

// Map a discriminated Card to the right DraggableCard payload props.
// Hoisted so the JSX spread reads as a single call instead of a nested
// ternary inside the surrounding `card ? (...) : null` expression.
type DraggablePayload = { value?: number; verdict?: boolean };
function cardPayload(
  card: { kind: "number"; value: number } | { kind: "verdict"; verdict: boolean },
): DraggablePayload {
  if (card.kind === "verdict") return { verdict: card.verdict };
  return { value: card.value };
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
                {...cardPayload(card)}
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
//
// State is a single reducer (not two useStates + cascading setters):
// the swap/fade-in/settle transitions are sequenced animation steps,
// each one a discrete dispatch. useReducer makes the state machine
// explicit and side-steps react-doctor's no-derived-useState +
// no-cascading-set-state rules by construction.
type PillState = { phase: "idle" | "out" | "in"; shown: string };
type PillAction = { type: "start-out" } | { type: "swap"; glyph: string } | { type: "settle" };

function pillReducer(state: PillState, action: PillAction): PillState {
  switch (action.type) {
    case "start-out":
      return { phase: "out", shown: state.shown };
    case "swap":
      return { phase: "in", shown: action.glyph };
    case "settle":
      return { phase: "idle", shown: state.shown };
    default:
      return state;
  }
}

// Per-operator shape behind the glyph. Reinforces the operation
// visually so the kid recognises "circle = plus, triangle = minus,
// diamond = times" before they even read the symbol. Comparators
// (=, >, <) fall through to the default circle so the swap animation
// has a consistent silhouette to land on.
type OperatorShapeKind = "circle" | "triangle" | "diamond";

function pickOperatorShape(glyph: string): OperatorShapeKind {
  if (glyph === "−") return "triangle";
  if (glyph === "×") return "diamond";
  return "circle"; // +, =, >, <, ÷, default
}

// SVG-based decorative shape. White fill + light-gray stroke matches
// the existing pill aesthetic; the pulse animation runs on this
// element only so the glyph text stays sharp. `aria-hidden` because
// the glyph itself is the meaningful content.
function OperatorShape({ kind }: { kind: OperatorShapeKind }) {
  const path = (() => {
    if (kind === "triangle") return <polygon points="50,8 92,86 8,86" />;
    if (kind === "diamond") return <polygon points="50,5 95,50 50,95 5,50" />;
    return <circle cx="50" cy="50" r="45" />;
  })();
  // Decorative-shape silhouette behind the glyph. The glyph text beside
  // it is the meaningful content; `role="img"` + the static aria-label
  // satisfies biome's noSvgWithoutTitle rule while keeping the SVG out
  // of the meaningful a11y flow (the kid's screen reader hears the
  // glyph from the adjacent text, not "circle operator background").
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 size-full animate-op-pulse drop-shadow-sm"
      data-test="operator-shape"
      data-shape={kind}
      role="img"
      aria-label="Operator background"
    >
      <g
        fill="var(--color-canvas-white)"
        stroke="var(--color-light-gray)"
        strokeWidth="4"
        strokeLinejoin="round"
      >
        {path}
      </g>
    </svg>
  );
}

function OperatorPill({ glyph }: { glyph: string }) {
  const [{ phase, shown }, dispatch] = useReducer(pillReducer, { phase: "idle", shown: glyph });

  useEffect(() => {
    if (glyph === shown) return;
    dispatch({ type: "start-out" });
    const t1 = window.setTimeout(() => dispatch({ type: "swap", glyph }), 200);
    const t2 = window.setTimeout(() => dispatch({ type: "settle" }), 200 + 280);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [glyph, shown]);

  const shape = pickOperatorShape(shown);
  // Triangle's visual centroid sits BELOW its geometric center (the
  // centroid of an upward-pointing triangle is at y = 2/3 of its
  // height). A glyph centered on the pill's geometric center reads
  // as "floating high" inside the triangle silhouette. Nudging the
  // glyph down a few px lands it on the centroid so the − sits in
  // the visual middle of the triangle, not above it. Circle and
  // diamond are radially symmetric — no offset needed.
  const glyphOffsetClass = shape === "triangle" ? "translate-y-[6px]" : "";
  return (
    <span
      className="relative flex size-14 shrink-0 select-none items-center justify-center data-[phase=in]:animate-op-in data-[phase=out]:animate-op-out"
      data-phase={phase}
      data-test="operator-pill"
    >
      <OperatorShape kind={shape} />
      <span
        className={`relative font-openrunde text-3xl font-bold text-slate-ink ${glyphOffsetClass}`}
      >
        {shown}
      </span>
    </span>
  );
}

// Operator pill paired with the on-error result chip. On a loss we surface
// the kid's actual computed LHS (e.g. 2 − 1 = 1) directly under the
// operator pill so the answer sits between the two cards he dragged in —
// the same spot his eye is already on after dropping the second card.
// The chip uses the existing `vivid-orange` failure palette + the hint
// slide-in keyframe so it reads as part of the same "wrong" beat as the
// HintTooltip below the action button.
function OperatorPillWithResult({
  glyph,
  failedComputed,
}: {
  glyph: string;
  failedComputed: number | null;
}) {
  return (
    <div className="relative shrink-0">
      <OperatorPill glyph={glyph} />
      {failedComputed !== null ? (
        <div
          className="absolute top-full left-1/2 mt-2 flex -translate-x-1/2 items-center gap-1 rounded-md border-2 border-vivid-orange/40 bg-vivid-orange/10 px-2 py-0.5 font-openrunde text-lg font-bold whitespace-nowrap text-vivid-orange shadow-subtle animate-hint-slide-in"
          data-test="operator-result-badge"
          aria-live="polite"
        >
          <span aria-hidden>=</span>
          <span>{failedComputed}</span>
        </div>
      ) : null}
    </div>
  );
}

function EquationView({
  equation,
  cards,
  dragLocked,
  failedComputed,
  onSwap,
  onStep,
}: {
  equation: EquationData;
  cards: CardCatalog;
  dragLocked: boolean;
  // The LHS value the kid's dragged cards actually compute to, surfaced
  // ONLY on a loss outcome. `null` while the round is pre-eval, mid-deal,
  // or won — the chip stays invisible in all of those cases.
  failedComputed: number | null;
  onSwap: (source: SlotLocator, target: SlotLocator) => void;
  // R9–R11 stepper-sum only — fired when the kid taps the top or bottom
  // half of the stepper card. `delta` is +1 or −1. Ignored by other
  // shapes.
  onStep: (delta: number) => void;
}) {
  // ── stepper-sum (R9–R11) ───────────────────────────────────────────
  // Layout matches find-missing-result: [a] op [b] = [stepper]. All
  // three slots are locked + pre-filled; the kid never drags. The
  // result slot renders a StepperCard whose top/bottom halves fire
  // onStep(+1) / onStep(−1). The kid taps up or down until the numeral
  // matches a OP b, then hits Evaluate.
  if (equation.shape === "stepper-sum") {
    const [aSlot, bSlot, sSlot] = equation.operandSlots;
    if (!aSlot || !bSlot || !sSlot) {
      throw new Error("EquationView: stepper-sum needs 3 operandSlots");
    }
    const sCard = sSlot.cardId ? cards[sSlot.cardId] : undefined;
    const stepperValue = sCard && sCard.kind === "number" ? sCard.value : 0;
    return (
      <div
        className="flex items-center justify-center gap-[28px]"
        data-test="equation"
        data-shape="stepper-sum"
      >
        <DropOrLockedSlot
          slot={aSlot}
          cards={cards}
          dragLocked={dragLocked}
          display="numeric"
          onSwap={onSwap}
        />
        <OperatorPillWithResult
          glyph={OPERATOR_GLYPH[equation.operator]}
          failedComputed={failedComputed}
        />
        <DropOrLockedSlot
          slot={bSlot}
          cards={cards}
          dragLocked={dragLocked}
          display="numeric"
          onSwap={onSwap}
        />
        <OperatorPill glyph="=" />
        <div className="h-[140px] w-[100px] shrink-0" data-test="equation-slot">
          <StepperCard
            value={stepperValue}
            onIncrement={() => onStep(1)}
            onDecrement={() => onStep(-1)}
          />
        </div>
      </div>
    );
  }

  // ── true-false-multiply (R12) ──────────────────────────────────────
  // Layout: [a] × [b] = [c]  ┊  [?]. All three LHS/RHS slots are locked
  // + pre-filled (kid never moves them); the kid lands a True or False
  // card in the verdict slot. A short vertical dashed line sits between
  // the claimed product card and the verdict slot, so the kid reads the
  // row as "here is the equation… here is your verdict".
  if (equation.shape === "true-false-multiply") {
    const [aSlot, bSlot, cSlot] = equation.operandSlots;
    if (!aSlot || !bSlot || !cSlot) {
      throw new Error("EquationView: true-false-multiply needs 3 operandSlots");
    }
    const verdictSlot = equation.verdictSlot;
    if (!verdictSlot) {
      throw new Error("EquationView: true-false-multiply needs a verdictSlot");
    }
    return (
      <div
        className="flex items-center justify-center gap-[28px]"
        data-test="equation"
        data-shape="true-false-multiply"
      >
        <DropOrLockedSlot
          slot={aSlot}
          cards={cards}
          dragLocked={dragLocked}
          display="numeric"
          onSwap={onSwap}
        />
        <OperatorPill glyph={OPERATOR_GLYPH.multiply} />
        <DropOrLockedSlot
          slot={bSlot}
          cards={cards}
          dragLocked={dragLocked}
          display="numeric"
          onSwap={onSwap}
        />
        <OperatorPill glyph="=" />
        <DropOrLockedSlot
          slot={cSlot}
          cards={cards}
          dragLocked={dragLocked}
          display="numeric"
          onSwap={onSwap}
        />
        <div
          className="h-[100px] border-l-2 border-dashed border-medium-gray/60"
          data-test="verdict-separator"
          aria-hidden
        />
        <VerdictSlot slot={verdictSlot} cards={cards} dragLocked={dragLocked} onSwap={onSwap} />
      </div>
    );
  }

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
        <OperatorPillWithResult
          glyph={OPERATOR_GLYPH[equation.operator]}
          failedComputed={failedComputed}
        />
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
                    {...cardPayload(card)}
                    dragLocked={dragLocked}
                    onSwap={onSwap}
                  />
                ) : null}
              </SlotWrapper>
            </div>
            {idx < equation.operandSlots.length - 1 ? (
              <OperatorPillWithResult
                glyph={OPERATOR_GLYPH[equation.operator]}
                failedComputed={failedComputed}
              />
            ) : null}
          </Fragment>
        );
      })}
      <OperatorPill glyph={COMPARATOR_GLYPH[equation.comparator ?? "eq"]} />
      <div className="h-[140px] w-[100px] shrink-0">
        <Card
          value={equation.target && equation.target.kind === "number" ? equation.target.value : 0}
          variant="target"
          disabled
        />
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
  // DropOrLockedSlot is reused across find-missing-result (R5–R8) which
  // only deals number cards, so the narrowing is purely defensive.
  const cardValue = card && card.kind === "number" ? card.value : 0;
  if (slot.locked) {
    return (
      <div
        className="h-[140px] w-[100px] shrink-0"
        data-test="equation-slot"
        data-slot-locked="true"
      >
        <Card value={cardValue} variant="target" display={display} disabled />
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
            value={cardValue}
            display={display}
            dragLocked={dragLocked}
            onSwap={onSwap}
          />
        ) : null}
      </SlotWrapper>
    </div>
  );
}

// Droppable verdict slot for true-false-multiply (R9). Sits to the
// right of the equation's product card. Renders an empty dotted-ring
// placeholder when nothing's dropped; when a True/False card is
// committed, it renders the DraggableCard so the kid can swap it back
// out before clicking Evaluate.
function VerdictSlot({
  slot,
  cards,
  dragLocked,
  onSwap,
}: {
  slot: { id: string; cardId: string | null };
  cards: CardCatalog;
  dragLocked: boolean;
  onSwap: (source: SlotLocator, target: SlotLocator) => void;
}) {
  const card = slot.cardId ? cards[slot.cardId] : undefined;
  const verdict = card && card.kind === "verdict" ? card.verdict : undefined;
  return (
    <div className="h-[140px] w-[100px] shrink-0" data-test="verdict-slot">
      <SlotWrapper kind="equation" slotId={slot.id}>
        <EmptySlot />
        {card && verdict !== undefined ? (
          <DraggableCard
            key={card.id}
            locator={{ kind: "equation", id: slot.id }}
            cardId={card.id}
            verdict={verdict}
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
  // Disabled-grab feedback. The kid grabbed the swipe knob with the
  // equation still unfilled — shake the entire action row briefly and
  // re-mount the "Fill out the board!" prompt. Same affordance the
  // old disabled-tap Evaluate button had; just plumbed through the
  // swipe's `onDisabledAttempt` callback now.
  const handleDisabledAttempt = (): void => {
    setShake(false);
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
  // Three render branches at this row, decided by `won` × `attacks?`:
  //   - won + attacks      → 3-card attack picker (the standard flow)
  //   - won + no attacks   → legacy single "Attack!" button (no pilot)
  //   - !won               → Evaluate button (pre-eval state)
  // Independent && expressions read cleaner than a nested ternary here.
  const showAttackPicker = won && attacks;
  const showLegacyAttack = won && !attacks;
  return (
    <div className="flex w-full flex-col items-center gap-3" data-test="action-button">
      <div className="flex min-h-[160px] w-full items-center justify-center">
        {showAttackPicker && (
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
        )}
        {showLegacyAttack && (
          <button
            type="button"
            onClick={() => onAttack(null)}
            className="flex items-center gap-2 rounded-full bg-radiant-violet px-8 py-3 font-bold text-white shadow-subtle transition-transform duration-150 hover:scale-[1.04] active:scale-95"
            data-test="attack-button"
          >
            <CrossedSwordsIcon />
            <span>Attack!</span>
          </button>
        )}
        {!won && (
          <div
            className="relative w-full max-w-[480px] data-[shake=true]:animate-damage-shake"
            data-shake={shake ? "true" : undefined}
          >
            <SwipeToEvaluate
              canCommit={canEvaluate}
              onCommit={onEvaluate}
              onDisabledAttempt={handleDisabledAttempt}
            />
            {promptKey > 0 ? <FillPrompt key={promptKey} onDone={() => setPromptKey(0)} /> : null}
          </div>
        )}
      </div>
    </div>
  );
}

// Splash begin-descent click flow. The intro voiceover was removed
// from the splash — browser autoplay policy meant it required a click
// to fire anyway, which read as flaky. The Begin button still owns
// its own voiceover: await `playUntilEnded(begin-descent)` THEN wait
// 300ms, THEN call onBegin so the dive-in transition doesn't start
// until the spoken line lands. While we're waiting, the button is
// disabled so a double-tap can't queue a second descent.
function useSplashVoiceover(onBegin: () => void): {
  handleBegin: () => void;
  beginPending: boolean;
} {
  const sfx = useSound();
  const [beginPending, setBeginPending] = useState(false);

  const handleBegin = (): void => {
    if (beginPending) return;
    setBeginPending(true);
    void (async () => {
      await sfx.playUntilEnded("event-splash-begin-descent");
      await new Promise<void>((resolve) => window.setTimeout(resolve, 300));
      onBegin();
      // beginPending stays true through the dive-in — the splash
      // unmounts when onBegin completes its state transition, so the
      // flag doesn't matter past this point.
    })();
  };

  return { handleBegin, beginPending };
}

// The empty state the kid sees on a fresh visit before they've started a
// game. Replaces the "no enemy yet" stuck-look with a deliberate Begin
// affordance — clicking it triggers the dive-in animation, which fades
// out into the first round. The lore-fragment text sets the mood before
// the descent (8s of marine snow + light shafts) does the rest.
function Splash({ onBegin }: { onBegin: () => void }) {
  const { handleBegin, beginPending } = useSplashVoiceover(onBegin);
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-8 px-8 text-center"
      data-test="splash"
    >
      <div className="flex flex-col items-center gap-2">
        <p className="font-openrunde text-xs font-semibold uppercase tracking-[0.3em] text-muted-gray">
          The trench is waiting
        </p>
        <h2 className="font-openrunde text-5xl font-semibold text-slate-ink">Hadal Tide</h2>
        <p className="max-w-md text-base text-medium-gray">
          The echoes are confused. They've been counting in the dark for a long time. Help them
          remember.
        </p>
      </div>
      <button
        type="button"
        onClick={handleBegin}
        disabled={beginPending}
        className="flex items-center gap-2 rounded-full bg-radiant-violet px-10 py-4 font-openrunde text-xl font-bold text-white shadow-subtle transition-transform duration-150 hover:scale-[1.04] active:scale-95 disabled:cursor-wait disabled:opacity-80 disabled:hover:scale-100"
        data-test="splash-begin"
        data-begin-pending={beginPending ? "true" : undefined}
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
      <h2 className="font-openrunde text-4xl font-semibold text-slate-ink">The trench is calm.</h2>
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
  celebration: { fromRound: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 } | null;
  clear: () => void;
} {
  const [celebration, setCelebration] = useState<{
    fromRound: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  } | null>(null);
  const prevLevelRef = useRef<number | null>(roundIndex ?? null);
  useEffect(() => {
    if (!enabled) {
      setCelebration(null);
      prevLevelRef.current = roundIndex ?? null;
      return;
    }
    const curr = roundIndex ?? null;
    const prev = prevLevelRef.current;
    prevLevelRef.current = curr;
    if (prev == null) return;
    const isBoundary = ROUND_BOUNDARIES.includes(prev);
    if (!isBoundary) return;
    const advanced = curr != null && curr > prev;
    const completed = prev === FINAL_LEVEL_INDEX && (curr == null || gameStatus === "ended");
    if (advanced || completed) {
      setCelebration({ fromRound: roundOf(prev) });
    }
  }, [roundIndex, gameStatus, enabled]);
  useEffect(() => {
    if (!enabled) return;
    if (gameStatus === "ended" && prevLevelRef.current === FINAL_LEVEL_INDEX) {
      setCelebration({ fromRound: 12 });
    }
  }, [gameStatus, enabled]);
  return { celebration, clear: () => setCelebration(null) };
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
  useEffect(() => {
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
      if (!prev.round || prev.round.equation.shape !== "stepper-sum") return prev;
      const stepperSlot = prev.round.equation.operandSlots[2];
      if (!stepperSlot?.cardId) return prev;
      const level = findLevel(prev.round.index);
      const max = (level?.target ?? 20) + 3;
      return applyStep(prev, stepperSlot.cardId, delta, max);
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
      <GameBoard ownedCrystals={game.crystals}>
        <LeftCol transparent={isSplash}>{enemyAvatarNode}</LeftCol>
        <GameMain>
          <Top transparent={isSplash}>
            {game.round ? (
              <div className="flex size-full items-center justify-between px-3">
                <RoundIndicator
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
          </Top>
          <Center>
            {/* Three-way render: victory > splash (no round) > active round.
                The third arm doesn't need its own ternary because the
                preceding `!game.round ?` is exhaustive — if we reach the
                else, game.round is truthy. */}
            {ended && <VictoryPanel onPlayAgain={handlePlayAgain} />}
            {!ended && !game.round && <Splash onBegin={handleBegin} />}
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
                    canEvaluate={
                      // R12 true-false-multiply: only the verdict slot needs
                      // a card; operandSlots are pre-filled. R9–R11 stepper-
                      // sum: stepper card always has a value, so always
                      // evaluable. Everywhere else: every droppable operand
                      // slot must be full.
                      game.round.equation.shape === "true-false-multiply"
                        ? game.round.equation.verdictSlot?.cardId != null
                        : game.round.equation.shape === "stepper-sum" ||
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
          </Center>
          <Bottom transparent={isSplash}>{handNode}</Bottom>
        </GameMain>
        <RightCol transparent={isSplash}>{playerAvatarNode}</RightCol>
      </GameBoard>
    </>
  );
}
