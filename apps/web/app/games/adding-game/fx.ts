import { animate } from "animejs";

// Spawn a transient damage-number "projectile" that punches at the source,
// flies to the target, rotates and fades like a slash attack. Imperative
// DOM manipulation by design — the FX layer is non-React, lives outside
// the route's render path, and self-removes on completion. No state, no
// mount/unmount churn. Several can be in-flight simultaneously.
//
// `from` and `to` are typically resolved by querySelector on data-test
// attributes (the Evaluate button's container, the enemy avatar root).
// We snapshot bounding rects at call time, so layout shifts AFTER the call
// don't affect the projectile's trajectory.
export function spawnDamageProjectile(opts: { text: string; from: Element; to: Element }): void {
  if (typeof document === "undefined") return;
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const fromRect = opts.from.getBoundingClientRect();
  const toRect = opts.to.getBoundingClientRect();
  const fromX = fromRect.left + fromRect.width / 2;
  const fromY = fromRect.top + fromRect.height / 2;
  const toX = toRect.left + toRect.width / 2;
  const toY = toRect.top + toRect.height / 2;
  const dx = toX - fromX;
  const dy = toY - fromY;

  // Two-element nesting: parent owns position (translates from source to
  // target), inner owns the centering translate(-50%, -50%) plus the
  // visual transforms (scale, rotate, opacity). Splitting them lets each
  // animate cleanly without composite-transform parsing surprises.
  const parent = document.createElement("div");
  parent.style.cssText = [
    "position: fixed",
    `left: ${fromX}px`,
    `top: ${fromY}px`,
    "pointer-events: none",
    "z-index: 60",
    "will-change: transform",
  ].join(";");

  const inner = document.createElement("div");
  inner.textContent = opts.text;
  inner.style.cssText = [
    "transform: translate(-50%, -50%) scale(0.6)",
    "font-family: var(--font-display)",
    "font-size: 4rem",
    "font-weight: 800",
    "line-height: 1",
    "color: #fbbf24",
    "text-shadow: 0 0 12px rgba(220, 38, 38, 0.95), 0 4px 12px rgba(0, 0, 0, 0.7), 0 0 32px rgba(251, 191, 36, 0.6)",
    "white-space: nowrap",
    "will-change: transform, opacity",
  ].join(";");

  parent.appendChild(inner);
  document.body.appendChild(parent);

  // Phase 1 — impact pop (0–140ms): the number snaps in at the source,
  // overscaling slightly so it reads as an attack landing.
  animate(inner, {
    scale: [{ from: 0.6, to: 1.6 }],
    rotate: [{ from: -18, to: -18 }],
    duration: 140,
    ease: "outBack(2)",
  });

  // Phase 2 — flight to target (140–540ms): parent translates source →
  // target, inner shrinks + rotates + fades. Whip-fast then settle.
  animate(parent, {
    translateX: [0, dx],
    translateY: [0, dy],
    delay: 140,
    duration: 400,
    ease: "outQuart",
  });
  animate(inner, {
    scale: [1.6, 0.7],
    rotate: [-18, 28],
    opacity: [1, 0],
    delay: 140,
    duration: 400,
    ease: "outQuart",
    onComplete: () => parent.remove(),
  });
}
