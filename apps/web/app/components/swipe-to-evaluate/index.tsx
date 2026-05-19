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
  trackLeft: number;
  trackWidth: number;
  moved: boolean;
};

export const SwipeToEvaluate = defineComponent(SwipeToEvaluatePropsSchema, (props) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  const progressRef = useRef(0);
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

  const setProgressValue = (next: number): number => {
    const bounded = Math.max(0, Math.min(1, next));
    progressRef.current = bounded;
    setProgress(bounded);
    return bounded;
  };

  const progressForClientX = (clientX: number, drag: DragSession): number => {
    const travel = Math.max(0, drag.trackWidth - KNOB_SIZE_PX - TRACK_PADDING_PX * 2);
    if (travel === 0) return 0;
    const restCenterX = drag.trackLeft + drag.trackWidth - TRACK_PADDING_PX - KNOB_SIZE_PX / 2;
    return Math.max(0, Math.min(1, (restCenterX - clientX) / travel));
  };

  // ── Drag lifecycle ─────────────────────────────────────────────────
  // We attach pointermove / pointerup / pointercancel to WINDOW for
  // the duration of the drag, NOT to the track element. With mouse
  // input, the cursor can leave the track at the speed of light;
  // window listeners always receive those events regardless of what
  // element is currently under the cursor. setPointerCapture is a
  // theoretical alternative but races on Safari and silently drops
  // events when capture transfers — the window-listener pattern is
  // the canonical drag implementation for exactly this reason.
  //
  // The track only owns onPointerDown (kick the drag); the cleanup
  // path tears down its own listeners so a fresh drag re-installs
  // clean handlers each grab.

  const finishDrag = (committed: boolean): void => {
    dragRef.current = null;
    setIsDragging(false);
    stopSwipeProgress(committed);
    if (committed) {
      // Snap to full + brief hold so the kid sees the bar fill before
      // the parent re-renders into the win/loss state.
      setCommitting(true);
      setProgressValue(1);
      window.setTimeout(() => {
        props.onCommit();
        setCommitting(false);
        setProgressValue(0);
      }, COMMIT_HOLD_MS);
    } else {
      // Spring back via the !isDragging transition class above.
      setProgressValue(0);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (committing) return;
    if (dragRef.current) return; // already dragging — ignore second pointer
    const trackBox = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const measuredTrackWidth = trackBox.width || trackWidth;
    if (!props.canCommit) {
      // Disabled grab — fire the optional callback so the parent can
      // surface its "fill out the board" prompt; the rest of the drag
      // still tracks the finger so the kid gets tactile feedback,
      // committing just no-ops on release.
      props.onDisabledAttempt?.();
    }
    const drag: DragSession = {
      pointerId: e.pointerId,
      trackLeft: trackBox.left,
      trackWidth: measuredTrackWidth,
      moved: false,
    };
    dragRef.current = drag;
    setIsDragging(true);
    // Kick the procedural oscillator. Web Audio unlocks on this
    // gesture (iOS Safari requires a user gesture to resume).
    startSwipeProgress();
    const initial = setProgressValue(progressForClientX(e.clientX, drag));
    updateSwipeProgress(initial);

    // Window listeners — own every subsequent move/up event for this
    // pointer regardless of where the cursor goes. Same handlers also
    // catch pointercancel so a system gesture (iOS Safari hands the
    // gesture off to the OS) cleanly bookends the audio + state.
    const onWindowMove = (ev: PointerEvent): void => {
      const current = dragRef.current;
      if (!current || current.pointerId !== ev.pointerId) return;
      const previous = progressRef.current;
      const next = setProgressValue(progressForClientX(ev.clientX, current));
      if (Math.abs(next - previous) > 0.01) current.moved = true;
      updateSwipeProgress(next);
    };
    const onWindowEnd = (ev: PointerEvent): void => {
      const current = dragRef.current;
      if (!current || current.pointerId !== ev.pointerId) return;
      window.removeEventListener("pointermove", onWindowMove);
      window.removeEventListener("pointerup", onWindowEnd);
      window.removeEventListener("pointercancel", onWindowEnd);
      const committed = props.canCommit && current.moved && progressRef.current >= COMMIT_THRESHOLD;
      finishDrag(committed);
    };
    window.addEventListener("pointermove", onWindowMove);
    window.addEventListener("pointerup", onWindowEnd);
    window.addEventListener("pointercancel", onWindowEnd);
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
        onPointerDown={handlePointerDown}
        className={`relative w-full touch-none overflow-hidden rounded-full border-2 ${trackToneClass}`}
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
        {/* Knob — visual thumb. The track captures the pointer so the
            centered label area also starts the charge gesture. The Swords glyph hints
            "attack" so the swipe feels like an action verb, not a
            generic UI affordance. */}
        <div
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
