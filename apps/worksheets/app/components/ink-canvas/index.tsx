import type { Point, Stroke } from "@dean-stack/handwriting-recognizer";
import { type ReactNode, useCallback, useEffect, useRef } from "react";

import { defineComponent } from "~/lib/define-component";

import { InkCanvasPropsSchema } from "./schema";

type AcceptedPointerType = "pen" | "mouse" | "touch";

// HTML canvas overlay for Apple Pencil ink capture.
//
// Pillar 3 — this is a PURE UI surface. It doesn't touch IDB or atoms.
// Captured strokes are emitted via onStrokesComplete; the parent
// (AnswerCell) is responsible for persistence.
//
// Pillar — React Compiler purity: every canvas mutation happens in
// useEffect or event handlers. Render returns only the <canvas> element.
//
// Why HTML canvas over Pixi: this is short-lived ink trail rendering,
// 30-200 line segments per digit. A 2D context call beats Pixi's scene
// graph setup for both bundle size and event-latency simplicity. Pixi
// remains the right call for the worksheet body — different problem.
export const InkCanvas = defineComponent(InkCanvasPropsSchema, (props): ReactNode => {
  const {
    width,
    height,
    inputModes,
    endStrokeAfterMs,
    inkColor,
    initialStrokes,
    onStrokesComplete,
    onClear,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Accumulated strokes for this gesture. Refs (not state) because the
  // canvas mutation pipeline is a side channel — React shouldn't re-render
  // mid-stroke, and the recompiler can't help with raw pointer events.
  const strokesRef = useRef<Stroke[]>([]);
  const activeStrokeRef = useRef<Point[] | null>(null);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onStrokesComplete);
  onCompleteRef.current = onStrokesComplete;
  const onClearRef = useRef(onClear);
  onClearRef.current = onClear;
  // initialStrokes is read ONCE on mount. A new `[]` literal from the parent
  // on every re-render would otherwise re-seed and wipe the kid's strokes —
  // the bug that motivated this ref pattern. Subsequent prop changes are
  // ignored; for stroke replay after the cell mounts, use a `key` remount.
  const seedStrokesRef = useRef<readonly Stroke[]>(initialStrokes);

  // Repaint the entire accumulated stroke set into the canvas. Cheap
  // (~200 lineTo() calls max per repaint) and the only correct way to
  // handle replay-from-initialStrokes + clear without retained-mode bugs.
  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = inkColor;
    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke.points, dpr);
    }
    const active = activeStrokeRef.current;
    if (active && active.length > 0) {
      drawStroke(ctx, active, dpr);
    }
  }, [inkColor]);

  // Latest-repaint stable handle for the long-lived pointer + clear
  // effects below. The effects mount native addEventListener handlers
  // ONCE per canvas — keeping `repaint` in their dep array would
  // tear down + rebuild the event subscription on every parent
  // re-render (each render returns a new `repaint` identity from
  // useCallback when `inkColor` changes, etc.). React-doctor's
  // recommended fix is `useEffectEvent`, which is still experimental
  // in React 19; this ref pattern is the stable equivalent.
  const repaintRef = useRef(repaint);
  repaintRef.current = repaint;

  // DPR setup. Re-runs only when canvas size changes — keeps the ref-
  // stamped backing-store size synchronized. Does NOT re-seed strokes;
  // that's the separate mount-only effect below.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    repaint();
  }, [width, height, repaint]);

  // Mount-only: seed the stroke accumulator from the FIRST `initialStrokes`
  // value (captured into seedStrokesRef during render). Empty `[]` deps
  // by design — re-running on subsequent initialStrokes changes was the
  // bug that wiped user strokes mid-session when the parent re-rendered
  // with a new array literal. To replay strokes after mount, key-remount
  // the canvas via `key={...}` from the parent.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only seed; see comment above
  // react-doctor-disable-next-line react-doctor/exhaustive-deps
  useEffect(() => {
    strokesRef.current = seedStrokesRef.current.map((s) => ({
      points: s.points.map((p) => ({ ...p })),
    }));
    repaintRef.current();
  }, []);

  // Pointer event wiring. Uses native addEventListener (not React's
  // synthetic events) because we need passive: false to call
  // preventDefault on touch events for palm rejection, and the React
  // synthetic event pool would otherwise discard the event before our
  // handler runs.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const accepted = new Set(inputModes);

    function flushEndStroke(): void {
      if (endTimerRef.current !== null) {
        clearTimeout(endTimerRef.current);
        endTimerRef.current = null;
      }
      const cb = onCompleteRef.current;
      if (cb) cb(strokesRef.current);
    }

    function startStroke(ev: PointerEvent): void {
      if (!accepted.has(ev.pointerType as AcceptedPointerType)) return;
      if (endTimerRef.current !== null) {
        clearTimeout(endTimerRef.current);
        endTimerRef.current = null;
      }
      const rect = canvas?.getBoundingClientRect();
      if (!rect || !canvas) return;
      activeStrokeRef.current = [
        {
          x: ev.clientX - rect.left,
          y: ev.clientY - rect.top,
          t: ev.timeStamp,
          pressure: ev.pressure || undefined,
        },
      ];
      canvas.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    }

    function moveStroke(ev: PointerEvent): void {
      if (!activeStrokeRef.current) return;
      if (!accepted.has(ev.pointerType as AcceptedPointerType)) return;
      const rect = canvas?.getBoundingClientRect();
      if (!rect) return;
      activeStrokeRef.current.push({
        x: ev.clientX - rect.left,
        y: ev.clientY - rect.top,
        t: ev.timeStamp,
        pressure: ev.pressure || undefined,
      });
      repaintRef.current();
      ev.preventDefault();
    }

    function endStroke(ev: PointerEvent): void {
      if (!activeStrokeRef.current) return;
      if (!accepted.has(ev.pointerType as AcceptedPointerType)) return;
      // Commit the active stroke into the accumulated set.
      strokesRef.current = [...strokesRef.current, { points: activeStrokeRef.current }];
      activeStrokeRef.current = null;
      try {
        canvas?.releasePointerCapture(ev.pointerId);
      } catch {
        // already released
      }
      repaintRef.current();
      // Start the end-of-gesture timer; cancelled by the next pointerdown.
      if (endTimerRef.current !== null) clearTimeout(endTimerRef.current);
      endTimerRef.current = setTimeout(flushEndStroke, endStrokeAfterMs);
      ev.preventDefault();
    }

    canvas.addEventListener("pointerdown", startStroke);
    canvas.addEventListener("pointermove", moveStroke);
    canvas.addEventListener("pointerup", endStroke);
    canvas.addEventListener("pointercancel", endStroke);
    return () => {
      canvas.removeEventListener("pointerdown", startStroke);
      canvas.removeEventListener("pointermove", moveStroke);
      canvas.removeEventListener("pointerup", endStroke);
      canvas.removeEventListener("pointercancel", endStroke);
      if (endTimerRef.current !== null) {
        clearTimeout(endTimerRef.current);
        endTimerRef.current = null;
      }
    };
  }, [endStrokeAfterMs, inputModes]);

  // Imperative clear handler — exposed on the canvas dataset attribute so
  // the AnswerCell parent can wire a button without prop-drilling refs.
  // Calls onClear so the parent can also clear its own state.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function handleClear(): void {
      strokesRef.current = [];
      activeStrokeRef.current = null;
      if (endTimerRef.current !== null) {
        clearTimeout(endTimerRef.current);
        endTimerRef.current = null;
      }
      repaintRef.current();
      const cb = onClearRef.current;
      if (cb) cb();
    }
    // CustomEvent contract: dispatch `new CustomEvent("ink-canvas:clear")`
    // on the canvas to clear it. Used by AnswerCell's clear button.
    canvas.addEventListener("ink-canvas:clear", handleClear);
    return () => canvas.removeEventListener("ink-canvas:clear", handleClear);
  }, []);

  // Expose the canvas element to the parent via the data attribute the
  // clear contract already uses (data-test="ink-canvas"). AnswerCell
  // queries the element and animates its opacity for the ink→digit
  // morph; the canvas itself stays pure and unopinionated about
  // presentation chrome.
  return (
    <canvas
      ref={canvasRef}
      data-test="ink-canvas"
      style={{
        touchAction: "none",
        // Display block prevents the canvas's inline default from
        // adding a phantom 5px gap at the bottom.
        display: "block",
        // CSS transition for the parent-driven opacity (set via the
        // `data-faded="1"` attribute on the wrapping cell). Quick + soft
        // — the actual fade is timed to coincide with the digit fade-in.
        transition: "opacity 280ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    />
  );
});

// Stroke renderer. Uses quadratic Beziers between consecutive midpoints
// for visual smoothness — the classic "Bezier-smoothed polyline" trick.
// Falls back to a plain line for two-point strokes.
function drawStroke(ctx: CanvasRenderingContext2D, points: readonly Point[], dpr: number): void {
  if (points.length === 0) return;
  ctx.beginPath();
  const first = points[0];
  if (!first) return;
  ctx.moveTo(first.x * dpr, first.y * dpr);
  if (points.length === 1) {
    // Single dot — draw a tiny filled circle so taps register visually.
    ctx.arc(first.x * dpr, first.y * dpr, 1.5 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    return;
  }
  // Vary line width with pressure if available; otherwise constant.
  ctx.lineWidth = 2 * dpr;
  for (let i = 1; i < points.length - 1; i++) {
    const cur = points[i];
    const next = points[i + 1];
    if (!cur || !next) continue;
    const mx = (cur.x + next.x) / 2;
    const my = (cur.y + next.y) / 2;
    ctx.quadraticCurveTo(cur.x * dpr, cur.y * dpr, mx * dpr, my * dpr);
  }
  const last = points[points.length - 1];
  if (last) ctx.lineTo(last.x * dpr, last.y * dpr);
  ctx.stroke();
}
