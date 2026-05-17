import { ArrowLeft, Swords } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";

import { defineComponent } from "~/lib/define-component";
import { startSwipeProgress, stopSwipeProgress, updateSwipeProgress } from "~/sound/procedural";

import { SwipeToEvaluatePropsSchema } from "./schema";

// Right-to-left swipe-to-commit. Replaces the Evaluate button so the
// kid is committing to the answer with a deliberate, attack-like
// gesture (throwing the equation at the enemy on the left edge of
// the board) instead of a tap.
//
// Geometry:
//   - Track is the full component width (the parent constrains it).
//   - Knob is a 56px circle pinned to the RIGHT edge at rest.
//   - Swiping moves the knob LEFT in real time; the fill expands
//     RIGHT-to-LEFT behind it so the kid sees the commitment grow.
//   - Past `COMMIT_THRESHOLD`, releasing fires onCommit. Below the
//     threshold, releasing springs the knob back to the right edge.
//
// Disabled state (canCommit === false): the knob and fill render
// muted; the kid can still grab to get tactile feedback, and the
// optional onDisabledAttempt fires once per grab so the parent can
// show the same "fill the board first" hint the old Evaluate
// button surfaced on a disabled tap.

const KNOB_SIZE_PX = 56;
const TRACK_HEIGHT_PX = 64;
const TRACK_PADDING_PX = 4;
// 70% of the track distance commits — generous enough that a kid's
// quick hand still lands the swipe, tight enough that an accidental
// drift doesn't trip it.
const COMMIT_THRESHOLD = 0.7;
// Spring-back duration when the kid releases below the threshold.
const SPRING_BACK_MS = 220;
// Commit-fill animation duration before onCommit fires — lets the kid
// see the knob hit the left edge and the bar fully fill in.
const COMMIT_HOLD_MS = 180;

type DragSession = {
  pointerId: number;
  startX: number;
  trackWidth: number;
};

export const SwipeToEvaluate = defineComponent(SwipeToEvaluatePropsSchema, (props) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  // `progress` is 0 (rest, right) → 1 (committed, left). Used by both
  // the knob transform and the fill width so they stay in lockstep.
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [committing, setCommitting] = useState(false);
  // Track width is measured with a ResizeObserver so the knob's max
  // travel is always pixel-accurate, not tied to a hardcoded width.
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setTrackWidth(entry.contentRect.width);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // The knob travels `trackWidth - (knob + 2 * padding)` pixels at
  // progress=1. Clamped at 0 for the brief frame before the
  // ResizeObserver fires.
  const maxTravelPx = Math.max(0, trackWidth - KNOB_SIZE_PX - TRACK_PADDING_PX * 2);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (committing) return;
    // setPointerCapture throws when the pointerId isn't an active
    // browser pointer — happens with synthetic `dispatchEvent` from
    // Playwright tests. The drag still works (events target the
    // knob directly), so swallow the throw and proceed.
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // no-op
    }
    if (!props.canCommit) {
      // Disabled grab — fire the optional callback so the parent can
      // surface its "fill out the board" prompt, then let the rest of
      // the drag run silently (the knob still tracks the finger,
      // committing still no-ops on release).
      props.onDisabledAttempt?.();
    }
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, trackWidth };
    setIsDragging(true);
    // Kick the procedural oscillator. Web Audio unlocks on this
    // gesture (iOS Safari requires a user gesture to resume). We
    // fire the audio EVEN ON A DISABLED GRAB — the rising tone is
    // tactile feedback that the swipe is being tracked; the eventual
    // "miss" sound on release without commit closes the gesture so
    // the kid never feels like the UI ignored them.
    startSwipeProgress();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const deltaX = e.clientX - drag.startX;
    const travel = Math.max(0, drag.trackWidth - KNOB_SIZE_PX - TRACK_PADDING_PX * 2);
    if (travel === 0) return;
    // Right→left: negative deltaX increases progress.
    const next = Math.max(0, Math.min(1, -deltaX / travel));
    setProgress(next);
    updateSwipeProgress(next);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>): void => {
    const drag = dragRef.current;
    if (!drag) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Same rationale as setPointerCapture above — synthetic events
      // may not own a real capture to release.
    }
    dragRef.current = null;
    setIsDragging(false);
    const committed = props.canCommit && progress >= COMMIT_THRESHOLD;
    // Always bookend the procedural audio. `committed=true` plays the
    // ding chime; `committed=false` plays the miss tone — covers BOTH
    // "released too early" AND "swiped fully on a disabled affordance"
    // (since the swipe was tracked but never qualified for a commit).
    // The win/loss SFX for the equation itself still fires later from
    // useEvaluateHandler.
    stopSwipeProgress(committed);
    if (committed) {
      // Snap to full + brief hold so the kid sees the bar fill before
      // the parent re-renders into the win/loss state.
      setCommitting(true);
      setProgress(1);
      window.setTimeout(() => {
        props.onCommit();
        // Reset for the next round. If the parent flips to the
        // win-state (different component), this state is GC'd anyway;
        // for a loss it leaves the track ready for the next try.
        setCommitting(false);
        setProgress(0);
      }, COMMIT_HOLD_MS);
    } else {
      // Spring back. We don't `setIsDragging(false)` AGAIN here — the
      // existing transition class handles the snap because isDragging
      // already flipped off above.
      setProgress(0);
    }
  };

  // Knob style — pinned at right at rest, translateX(-progress * max)
  // as the kid swipes. Transition disabled while dragging so the
  // motion tracks the finger 1:1; enabled on release so the
  // spring-back / commit-snap animates.
  const knobStyle: CSSProperties = {
    width: KNOB_SIZE_PX,
    height: KNOB_SIZE_PX,
    right: TRACK_PADDING_PX,
    top: TRACK_PADDING_PX,
    transform: `translateX(${-progress * maxTravelPx}px)`,
    transition: isDragging
      ? "none"
      : `transform ${SPRING_BACK_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
  };

  // Fill — grows from the right edge leftward as progress increases.
  // Uses width % so it scales with the track regardless of pixel size.
  const fillStyle: CSSProperties = {
    width: `${progress * 100}%`,
    transition: isDragging ? "none" : `width ${SPRING_BACK_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
  };

  const label = props.label ?? "Swipe to attack";
  const muted = !props.canCommit;
  const trackToneClass = muted
    ? "border-muted-gray/40 bg-light-gray/40"
    : "border-light-gray bg-canvas-white";
  const fillToneClass = muted ? "bg-muted-gray/40" : "bg-radiant-violet";
  const knobToneClass = muted
    ? "bg-muted-gray/70 text-white/70"
    : "bg-radiant-violet text-white shadow-md";
  const labelToneClass = muted ? "text-muted-gray" : "text-slate-ink";

  return (
    <div
      className="w-full max-w-[480px]"
      data-test="swipe-to-evaluate"
      data-can-commit={props.canCommit ? "true" : "false"}
      data-committing={committing ? "true" : undefined}
    >
      <div
        ref={trackRef}
        className={`relative w-full overflow-hidden rounded-full border-2 ${trackToneClass}`}
        style={{ height: TRACK_HEIGHT_PX }}
      >
        {/* Fill: anchored to the RIGHT edge, grows leftward with
            progress. Sits beneath the label so the text reads on top
            of the violet wash once the kid has committed past ~30%. */}
        <div
          className={`absolute inset-y-0 right-0 ${fillToneClass}`}
          style={fillStyle}
          aria-hidden
        />
        {/* Label band — centered text + left-pointing arrow that
            hints the swipe direction. `pointer-events-none` so taps
            on the label fall through to the track / knob. */}
        <div
          className={`pointer-events-none absolute inset-0 flex items-center justify-center gap-2 font-openrunde font-bold ${labelToneClass}`}
        >
          <ArrowLeft size={20} strokeWidth={3} aria-hidden />
          <span data-test="swipe-label">{muted ? "Fill out the board" : label}</span>
        </div>
        {/* Knob — captures the pointer. The Swords glyph hints
            "attack" so the swipe feels like an action verb, not a
            generic UI affordance. */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          className={`absolute flex touch-none cursor-grab items-center justify-center rounded-full active:cursor-grabbing ${knobToneClass}`}
          style={knobStyle}
          role="slider"
          tabIndex={muted ? -1 : 0}
          aria-label={muted ? "Disabled — fill out the equation first" : label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          data-test="swipe-knob"
        >
          <Swords size={24} strokeWidth={2.5} aria-hidden />
        </div>
      </div>
    </div>
  );
});
