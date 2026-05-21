import { animate } from "animejs";
import { type ReactNode, useRef } from "react";

import { Card } from "~/components/card";
import { getSfxPlayer } from "~/sound";

import { type SlotLocator, slotLocatorEquals } from "./swap";

// Foley wrappers — module-level so the drag handlers (which live inside
// component closures, not React render paths) can fire SFX without
// threading `useSound` through the prop chain. `getSfxPlayer` returns
// the singleton; the player respects the same mute/volume settings
// `useSound` syncs at the React layer.
//
// One pickup id (shared), two drop ids keyed off the destination slot:
// equation drops get the woody board-snap, hand drops (including
// reverts back to the hand) get the gentler paper plop.
function playPickup(): void {
  void getSfxPlayer().play("foley-card-pickup");
}
function playDropForKind(kind: SlotLocator["kind"]): void {
  void getSfxPlayer().play(kind === "equation" ? "foley-card-drop-snap" : "foley-card-drop-revert");
}

// ─── Tunables ─────────────────────────────────────────────────────────────
// Calibrated for a 6–8 year old's coordination on an iPad. The minimum drag
// distance prevents a tap from registering as a sloppy drag (kid puts finger
// down to think); the press scale and tilt are loud enough to read at arm's
// length without feeling cartoonish.
const PRESS_SCALE = 1.07;
const PRESS_TILT_MAX_DEG = 10;
const FRICTION_TILT_FACTOR = 0.5;
const FRICTION_TILT_MAX_DEG = 7;
const MIN_DRAG_DISTANCE_PX = 5;
// Snap is short on purpose. The hover-time magnetism (below) already pulled
// the card most of the way to the slot center, so the visible portion of
// the snap is short — 160ms feels like a landed thunk, not a glide.
const REVERT_DURATION_MS = 200;
const SNAP_DURATION_MS = 160;

// Magnetic snap: while hovering over a valid drop target, lerp the card's
// translated position toward the target slot's center by this factor. The
// card still tracks the cursor (with reduced amplitude); the visible effect
// is the card "settling" into the slot the moment the kid enters the zone.
//
// 0.0 = pure cursor follow (what we had before)
// 0.4 = noticeable pull, the card leads the cursor by ~40% toward center
// 1.0 = card pinned to slot center, cursor scrubs invisibly
const HOVER_MAGNETISM = 0.4;

// Velocity-driven lift — fast pointer movement adds a subtle scale boost
// on top of PRESS_SCALE so the card visually "rises higher" the harder
// the kid is sweeping it. EMA-smoothed so it eases when motion slows.
//
// Tuned to land in the 1.07 → 1.11 range across the realistic velocity
// envelope of an iPad fingertip (0–2 px/ms). Bigger range looks cartoonish
// at this card size; smaller is imperceptible.
const VELOCITY_LIFT_FACTOR = 0.04; // px/ms → extra scale
const VELOCITY_LIFT_MAX = 0.04; // hard cap (1.07 → 1.11)
// Smoothing: heavy weight on history so the lift doesn't jitter on a
// single fast frame, but enough new-sample weight to respond within
// ~3 frames (~50ms) of a velocity change.
const VELOCITY_SMOOTH_KEEP = 0.7;

// Flick gestures: an equation card flicked DOWN routes to the leftmost
// empty hand slot ("send home"); a hand card flicked UP routes to the
// leftmost empty equation operand slot ("commit"). Symmetric thresholds.
//
//   px/ms threshold: ~800 px/s feels like a deliberate flick on iPad and
//   leaves slow drags alone.
//   minimum distance: filters out a single jittery move sample.
//   sample window:    long enough that a brief release pause doesn't kill
//                     the velocity reading, short enough that a slow drag
//                     followed by a quick flick still registers the flick.
const FLICK_VELOCITY_PX_PER_MS = 0.8;
const FLICK_MIN_DISTANCE_PX = 40;
const VELOCITY_SAMPLE_WINDOW_MS = 100;

// Only one drag in-flight at a time. iPad multi-touch would otherwise fire
// concurrent drag-starts on adjacent cards if the kid grabs with two fingers.
let activeDragPointerId: number | null = null;

// ─── DOM helpers ──────────────────────────────────────────────────────────

function isReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function findSlotEl(loc: SlotLocator): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-slot-kind="${loc.kind}"][data-slot-id="${loc.id}"]`,
  );
}

// DOM order matches render order (querySelectorAll preserves it), so the
// first match is the leftmost empty slot — the natural "home" / "next slot
// to fill" for the flick gestures.
function findFirstEmptyHandSlot(): SlotLocator | null {
  return findFirstEmptyOf("hand");
}
function findFirstEmptyEquationSlot(): SlotLocator | null {
  return findFirstEmptyOf("equation");
}
function findFirstEmptyOf(kind: "hand" | "equation"): SlotLocator | null {
  const slots = document.querySelectorAll<HTMLElement>(`[data-slot-kind="${kind}"]`);
  for (const slot of slots) {
    if (slot.dataset.locked === "true") continue;
    if (slot.querySelector("[data-card-id]")) continue;
    const id = slot.dataset.slotId;
    if (id) return { kind, id };
  }
  return null;
}

type VelocitySample = { y: number; t: number };

function recordYSample(samples: VelocitySample[], y: number, t: number): void {
  samples.push({ y, t });
  const cutoff = t - VELOCITY_SAMPLE_WINDOW_MS;
  while (samples.length > 2 && (samples[0]?.t ?? 0) < cutoff) {
    samples.shift();
  }
}

function readEndVelocityY(samples: readonly VelocitySample[]): number {
  if (samples.length < 2) return 0;
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last) return 0;
  const dt = last.t - first.t;
  if (dt <= 0) return 0;
  return (last.y - first.y) / dt;
}

// elementFromPoint is the canonical "which slot is the pointer over" check.
// We set the dragged card to pointer-events: none during drag so it doesn't
// block the slot underneath from being detected.
function detectTargetSlot(x: number, y: number, source: SlotLocator): SlotLocator | null {
  const el = document.elementFromPoint(x, y);
  if (!(el instanceof HTMLElement)) return null;
  const slotEl = el.closest<HTMLElement>("[data-slot-id][data-slot-kind]");
  if (!slotEl) return null;
  // Locked equation slots (find-missing-result static operand) refuse drops.
  // Match the reducer's defense in applySwap so the kid never sees a card
  // visibly snap into a locked slot only to bounce back on the next React
  // commit.
  if (slotEl.dataset.locked === "true") return null;
  const id = slotEl.dataset.slotId;
  const kind = slotEl.dataset.slotKind;
  if (!id || (kind !== "hand" && kind !== "equation")) return null;
  const target: SlotLocator = { kind, id };
  if (slotLocatorEquals(target, source)) return null;
  return target;
}

// "Is the pointer over a disabled card?" — disabled cards block drops and
// fire negative feedback. The check is by data attribute on the card itself,
// not by slot position, so a future round can disable a card sitting in any
// slot (or no slot at all, like today's equation right-hand-side).
function isOverDisabledCard(x: number, y: number): boolean {
  const el = document.elementFromPoint(x, y);
  if (!(el instanceof HTMLElement)) return false;
  return el.closest('[data-card-disabled="true"]') !== null;
}

function applySlotHover(loc: SlotLocator): void {
  const slot = findSlotEl(loc);
  if (!slot) return;
  const cardEl = slot.querySelector<HTMLElement>("[data-card-id]");
  slot.dataset.hover = cardEl ? "filled" : "empty";
  if (cardEl) cardEl.dataset.willReplace = "true";
}

function clearSlotHover(loc: SlotLocator): void {
  const slot = findSlotEl(loc);
  if (!slot) return;
  delete slot.dataset.hover;
  const cardEl = slot.querySelector<HTMLElement>("[data-card-id]");
  if (cardEl) delete cardEl.dataset.willReplace;
}

function resetCardStyles(el: HTMLElement): void {
  // cssText="" clears every inline style in one CSSOM write; clearing
  // data-dragging tears down the Card-Charm CSS rules that key off it.
  el.style.cssText = "";
  delete el.dataset.dragging;
}

// The transform values applied at the moment of release. anime.js animates
// each property INDEPENDENTLY (translateX, translateY, rotate, scale) but
// during drag we set them as a composite `transform` string, which the
// CSSOM normalizes to `matrix(...)`. anime.js's value parser cannot reverse
// a matrix back into the four named components reliably, so it falls back
// to (0, 0, 0, 1) as the start values — producing a frame-1 teleport to
// origin and 220ms of "nothing animating." Passing `[from, to]` arrays
// explicitly bypasses that decomposition entirely.
//
// `scale` is dynamic per-frame (velocity lift) so the snap/revert needs to
// start from the actual live scale, not the constant PRESS_SCALE.
type DragTransform = { x: number; y: number; rotation: number; scale: number };

// ─── Drop animations ──────────────────────────────────────────────────────

function revertCard(el: HTMLElement, from: DragTransform): void {
  if (isReducedMotion()) {
    resetCardStyles(el);
    return;
  }
  animate(el, {
    translateX: [from.x, 0],
    translateY: [from.y, 0],
    rotate: [from.rotation, 0],
    scale: [from.scale, 1],
    duration: REVERT_DURATION_MS,
    ease: "outQuart",
    onComplete: () => resetCardStyles(el),
  });
}

// FLIP-style swap: dragged card animates to target slot center; if a card was
// already in target slot it animates the inverse delta (back to source slot
// center). Both animations run simultaneously; commit happens after the last
// resolves so the React re-render lands the cards at exactly the pixel
// positions where the animations parked them — no flash.
//
// Crucially we do NOT call `resetCardStyles` on the dragged element here.
// `<DraggableCard>` is keyed by `cardId` at the call-site, so React unmounts
// the old DOM node when the swap commits and mounts a fresh one at the
// slot's natural position (which equals where the animation ended). The old
// node — with its inline transform — is destroyed by React's reconciler.
// Resetting before commit would cause a one-frame snap-back; resetting after
// commit would mutate a detached node.
function snapAndCommit(
  el: HTMLElement,
  source: SlotLocator,
  target: SlotLocator,
  from: DragTransform,
  // Pre-computed in dragRef when hover entered the target. Null only on the
  // flick path (release fires snapAndCommit without the cursor having
  // crossed the target zone), in which case we fall back to a fresh rect
  // read.
  cachedDelta: Point | null,
  sourceCenter: Point,
  onSwap: (source: SlotLocator, target: SlotLocator) => void,
): void {
  const targetSlot = findSlotEl(target);
  if (!targetSlot) {
    revertCard(el, from);
    return;
  }

  let dx: number;
  let dy: number;
  if (cachedDelta) {
    dx = cachedDelta.x;
    dy = cachedDelta.y;
  } else {
    const c = elCenter(targetSlot);
    dx = c.x - sourceCenter.x;
    dy = c.y - sourceCenter.y;
  }

  const displacedCardEl = targetSlot.querySelector<HTMLElement>("[data-card-id]");

  if (isReducedMotion()) {
    onSwap(source, target);
    return;
  }

  let pending = displacedCardEl ? 2 : 1;
  const finalize = (): void => {
    pending -= 1;
    if (pending > 0) return;
    onSwap(source, target);
  };

  // Snap ease: outQuart decelerates decisively, no overshoot. Combined
  // with magnetism having already covered ~40% of the distance during
  // hover, the snap reads as a thunk, not a glide.
  animate(el, {
    translateX: [from.x, dx],
    translateY: [from.y, dy],
    rotate: [from.rotation, 0],
    scale: [from.scale, 1],
    duration: SNAP_DURATION_MS,
    ease: "outQuart",
    onComplete: finalize,
  });

  if (displacedCardEl) {
    displacedCardEl.style.transition = "none";
    animate(displacedCardEl, {
      translateX: [0, -dx],
      translateY: [0, -dy],
      duration: SNAP_DURATION_MS,
      ease: "outQuart",
      onComplete: finalize,
    });
  }
}

// ─── Components ───────────────────────────────────────────────────────────

type Point = { x: number; y: number };

type DragState = {
  source: SlotLocator;
  el: HTMLDivElement;
  initialX: number;
  initialY: number;
  // Last applied transform values — read on release so anime.js animates
  // FROM where the card visually is, not from a fallback (0,0,0,1).
  lastX: number;
  lastY: number;
  lastRotation: number;
  lastScale: number;
  // Pointer-X tracking for friction-tilt computation between move events.
  prevPointerX: number;
  prevPointerY: number;
  prevMoveTime: number;
  // EMA-smoothed pointer speed in px/ms — drives the velocity-lift scale.
  smoothedSpeed: number;
  pressTilt: number;
  currentTarget: SlotLocator | null;
  // Cached source slot center (computed once on drag start). Used to derive
  // every target's delta-from-source, so snap math doesn't re-read layout
  // on each interaction.
  sourceCenter: Point;
  // Cached translation that lands the card at the current target's center.
  // Recomputed when `currentTarget` changes (cheap: one rect read on hover
  // entry, none per-frame). Drives magnetism in moveDrag and the snap delta
  // on release.
  targetDelta: Point | null;
  hasMoved: boolean;
  pointerId: number;
  ySamples: VelocitySample[];
};

function elCenter(el: HTMLElement): Point {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function DraggableCard({
  locator,
  cardId,
  value,
  verdict,
  display,
  dragLocked,
  onSwap,
}: {
  locator: SlotLocator;
  cardId: string;
  // Number-card face value. Optional because R9 verdict cards have no
  // numeric face — the `verdict` prop drives the render instead.
  value?: number | undefined;
  // R9 verdict card. When set, the inner Card renders a True/False text
  // body instead of a number; `value` and `display` are ignored.
  verdict?: boolean | undefined;
  // Forwarded to the inner Card. R5/R6 pass "ten-frame" so hand and
  // equation operand cards render as a 2×5 grid; everywhere else
  // defaults to numeric. Explicit `| undefined` matches our strict
  // exactOptionalPropertyTypes setting — call sites can pass an
  // intermediate `display` prop that may itself be undefined without
  // having to spread-conditionally.
  display?: "numeric" | "ten-frame" | undefined;
  dragLocked: boolean;
  onSwap: (source: SlotLocator, target: SlotLocator) => void;
}): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>): void {
    if (dragLocked) return;
    if (activeDragPointerId !== null) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = ref.current;
    if (!el) return;

    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    activeDragPointerId = e.pointerId;

    const rect = el.getBoundingClientRect();
    const offsetFraction = (e.clientX - rect.left) / rect.width - 0.5;
    const pressTilt = clamp(offsetFraction * 20, -PRESS_TILT_MAX_DEG, PRESS_TILT_MAX_DEG);

    // Single CSSOM write batches all pre-grab style props with the
    // transform — separate writes reflow per-prop, audibly hitchy on
    // iPad during rapid grabs. Skipping a press anime: the old 130ms
    // ramp ran in parallel with manual writes once the kid moved, and
    // anime's parser couldn't read its own composite output reliably.
    // data-dragging is consumed by Echo-Crystal Card-Charm CSS
    // (Soft Hover, Bioluminescent Trail); cleared in resetCardStyles.
    el.style.cssText = `z-index: 50; touch-action: none; transition: none; will-change: transform; transform: rotate(${pressTilt}deg) scale(${PRESS_SCALE});`;
    el.dataset.dragging = "true";

    // Cache source center once. Used to derive target deltas without
    // re-reading the source's rect on every hover transition.
    const sourceSlotEl = findSlotEl(locator);
    const sourceCenter = sourceSlotEl ? elCenter(sourceSlotEl) : { x: 0, y: 0 };

    const now = performance.now();
    dragRef.current = {
      source: locator,
      el,
      initialX: e.clientX,
      initialY: e.clientY,
      lastX: 0,
      lastY: 0,
      lastRotation: pressTilt,
      lastScale: PRESS_SCALE,
      prevPointerX: e.clientX,
      prevPointerY: e.clientY,
      prevMoveTime: now,
      smoothedSpeed: 0,
      pressTilt,
      currentTarget: null,
      sourceCenter,
      targetDelta: null,
      hasMoved: false,
      pointerId: e.pointerId,
      ySamples: [{ y: e.clientY, t: now }],
    };
    // Pickup foley — the kid hears the paper-on-felt rustle the
    // moment their finger lands. Fires on EVERY grab (hand or
    // equation), shared across both source kinds.
    playPickup();
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.initialX;
    const dy = e.clientY - drag.initialY;

    if (!drag.hasMoved) {
      const dist = Math.hypot(dx, dy);
      if (dist < MIN_DRAG_DISTANCE_PX) return;
      drag.hasMoved = true;
      // pointer-events:none lets elementFromPoint see the slot beneath the card.
      drag.el.style.pointerEvents = "none";
    }

    const now = performance.now();
    const vx = e.clientX - drag.prevPointerX;
    const vy = e.clientY - drag.prevPointerY;
    const dtMs = Math.max(1, now - drag.prevMoveTime);
    drag.prevPointerX = e.clientX;
    drag.prevPointerY = e.clientY;
    drag.prevMoveTime = now;
    recordYSample(drag.ySamples, e.clientY, now);
    const friction = clamp(
      vx * FRICTION_TILT_FACTOR,
      -FRICTION_TILT_MAX_DEG,
      FRICTION_TILT_MAX_DEG,
    );
    const rot = drag.pressTilt + friction;

    // Velocity-driven lift. Pointer speed in px/ms, EMA-smoothed so brief
    // jitters don't flicker the scale. Capped extra so the lift stays
    // subtle.
    const instantSpeed = Math.hypot(vx, vy) / dtMs;
    drag.smoothedSpeed =
      drag.smoothedSpeed * VELOCITY_SMOOTH_KEEP + instantSpeed * (1 - VELOCITY_SMOOTH_KEEP);
    const liftScale =
      PRESS_SCALE + clamp(drag.smoothedSpeed * VELOCITY_LIFT_FACTOR, 0, VELOCITY_LIFT_MAX);

    // Detect target FIRST so we can recompute targetDelta on transitions
    // and apply magnetism in this same frame.
    const target = detectTargetSlot(e.clientX, e.clientY, drag.source);
    // A disabled card under the pointer wins over slot detection. (In
    // practice, today's only disabled card sits outside any slot, so the
    // two paths don't conflict — but keeping the precedence explicit
    // means a future disabled-card-inside-a-slot case fires red, not green.)
    const overDisabled = !target && isOverDisabledCard(e.clientX, e.clientY);

    if (!slotLocatorEquals(target, drag.currentTarget)) {
      if (drag.currentTarget) clearSlotHover(drag.currentTarget);
      if (target) applySlotHover(target);
      drag.currentTarget = target;
      // Cache the target's delta-from-source so per-frame magnetism is
      // pure arithmetic, no rect reads. Recomputed only on transition.
      if (target) {
        const slotEl = findSlotEl(target);
        if (slotEl) {
          const c = elCenter(slotEl);
          drag.targetDelta = { x: c.x - drag.sourceCenter.x, y: c.y - drag.sourceCenter.y };
        } else {
          drag.targetDelta = null;
        }
      } else {
        drag.targetDelta = null;
      }
    }

    // Magnetism — pull the card toward target center while still letting
    // the cursor steer. This is "predict the drop" the user asked for:
    // hover time is spent shortening the visible distance to the target,
    // so the snap on release is barely perceptible.
    let appliedDx = dx;
    let appliedDy = dy;
    if (drag.targetDelta) {
      appliedDx = dx + (drag.targetDelta.x - dx) * HOVER_MAGNETISM;
      appliedDy = dy + (drag.targetDelta.y - dy) * HOVER_MAGNETISM;
    }

    drag.el.style.transform = `translate3d(${appliedDx}px, ${appliedDy}px, 0) rotate(${rot}deg) scale(${liftScale})`;
    drag.lastX = appliedDx;
    drag.lastY = appliedDy;
    drag.lastRotation = rot;
    drag.lastScale = liftScale;

    // Tri-state feedback on the dragged card itself: green ring (valid),
    // red ring (over a disabled card), nothing (empty space). The kid can
    // read either the slot's signal or the card's signal and know the
    // drop's status — both cues update together.
    const nextFeedback: "valid" | "invalid" | "none" = (() => {
      if (target) return "valid";
      if (overDisabled) return "invalid";
      return "none";
    })();
    if (nextFeedback === "valid") {
      drag.el.dataset.validDrop = "true";
      delete drag.el.dataset.invalidDrop;
    } else if (nextFeedback === "invalid") {
      delete drag.el.dataset.validDrop;
      drag.el.dataset.invalidDrop = "true";
    } else {
      delete drag.el.dataset.validDrop;
      delete drag.el.dataset.invalidDrop;
    }
  }

  function onPointerEnd(e: React.PointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    activeDragPointerId = null;

    if (drag.currentTarget) clearSlotHover(drag.currentTarget);
    delete drag.el.dataset.validDrop;
    delete drag.el.dataset.invalidDrop;
    drag.el.style.pointerEvents = "";

    const fromTransform: DragTransform = {
      x: drag.lastX,
      y: drag.lastY,
      rotation: drag.lastRotation,
      scale: drag.lastScale,
    };

    // Flick gestures — equation card flicked DOWN to the hand, hand card
    // flicked UP to the equation. Both override any hovered target on
    // purpose: "if you flicked, you didn't aim." The flick path didn't
    // hover the resolved target, so cachedDelta is null — snapAndCommit
    // computes it on the fly from the source center cache.
    if (drag.hasMoved) {
      const totalDy = e.clientY - drag.initialY;
      const velocityY = readEndVelocityY(drag.ySamples);

      if (
        drag.source.kind === "equation" &&
        totalDy >= FLICK_MIN_DISTANCE_PX &&
        velocityY >= FLICK_VELOCITY_PX_PER_MS
      ) {
        const home = findFirstEmptyHandSlot();
        if (home) {
          playDropForKind(home.kind);
          snapAndCommit(drag.el, drag.source, home, fromTransform, null, drag.sourceCenter, onSwap);
          return;
        }
      }

      if (
        drag.source.kind === "hand" &&
        totalDy <= -FLICK_MIN_DISTANCE_PX &&
        velocityY <= -FLICK_VELOCITY_PX_PER_MS
      ) {
        const eqSlot = findFirstEmptyEquationSlot();
        if (eqSlot) {
          playDropForKind(eqSlot.kind);
          snapAndCommit(
            drag.el,
            drag.source,
            eqSlot,
            fromTransform,
            null,
            drag.sourceCenter,
            onSwap,
          );
          return;
        }
      }
    }

    if (!drag.hasMoved || !drag.currentTarget) {
      // Revert path — no target, card flies back to where it came
      // from. The destination kind matches the source kind, so the
      // foley matches: a hand-origin reverts to a hand slot (soft
      // plop), an equation-origin reverts to an equation slot
      // (woody snap).
      playDropForKind(drag.source.kind);
      revertCard(drag.el, fromTransform);
      return;
    }
    playDropForKind(drag.currentTarget.kind);
    snapAndCommit(
      drag.el,
      drag.source,
      drag.currentTarget,
      fromTransform,
      drag.targetDelta,
      drag.sourceCenter,
      onSwap,
    );
  }

  return (
    <div
      ref={ref}
      data-card-id={cardId}
      className="absolute inset-0 cursor-grab touch-none rounded-[4px] transition-[opacity,box-shadow] duration-150 active:cursor-grabbing pointer-fine:hover:shadow-lg data-[invalid-drop=true]:ring-4 data-[invalid-drop=true]:ring-vivid-orange/80 data-[valid-drop=true]:ring-4 data-[valid-drop=true]:ring-success-green/80 data-[will-replace=true]:opacity-60"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <Card
        {...(value !== undefined ? { value } : {})}
        {...(verdict !== undefined ? { verdict } : {})}
        display={display}
      />
    </div>
  );
}

export function SlotWrapper({
  kind,
  slotId,
  locked = false,
  children,
}: {
  kind: "hand" | "equation";
  slotId: string;
  // Locked slots (find-missing-result static operand) ignore hover, refuse
  // drops, and skip the magnetic-snap hover scale. The data attribute is
  // read by drag.tsx's detectTargetSlot / findFirstEmptyOf helpers.
  locked?: boolean;
  children: ReactNode;
}): ReactNode {
  return (
    <div
      data-slot-kind={kind}
      data-slot-id={slotId}
      data-locked={locked ? "true" : undefined}
      className={
        locked
          ? "group relative size-full"
          : "group relative size-full transition-transform duration-150 data-[hover=empty]:scale-[1.04] data-[hover=filled]:scale-[1.02]"
      }
    >
      {children}
    </div>
  );
}

// Empty-slot visual. Always rendered — the slot is a persistent surface that
// the card sits on top of, never replaces. Lift the card and the dotted
// border is already there. The dotted border morphs to a solid brand-colored
// ring + tinted fill when the parent SlotWrapper is hovered (group-data
// variant). When a card is on top of a hand slot, the card is opaque and
// covers the dotted frame; only when no card is in the slot (or it's
// translated away by drag) does the frame show through.
export function EmptySlot(): ReactNode {
  return (
    <div className="absolute inset-0 rounded-[4px] border-2 border-dotted border-medium-gray/80 transition-colors duration-150 group-data-[hover=empty]:border-solid group-data-[hover=empty]:border-success-green group-data-[hover=empty]:bg-pale-mint/60" />
  );
}
