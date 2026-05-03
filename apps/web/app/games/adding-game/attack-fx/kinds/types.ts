import type { Application } from "pixi.js";

// Shared context every kind receives. `from` is the attacker's center
// (action button area), `to` is the target's center (enemy avatar).
// `color` is the kind's tint as a hex string (e.g. "#67e8f9").
export type AttackCtx = {
  app: Application;
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
};

// All kinds resolve their Promise within ≤500ms — the user's hard cap.
export const ATTACK_DURATION_MS = 500;

// Useful tweenables — small, copy-pasteable helpers.
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeOutQuart(t: number): number {
  return 1 - (1 - t) ** 4;
}

export function easeOutBack(t: number, overshoot = 1.4): number {
  const c1 = overshoot;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}
