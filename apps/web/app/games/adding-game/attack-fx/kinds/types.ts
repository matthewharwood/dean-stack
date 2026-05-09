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

// Useful tweenable — small, copy-pasteable helper. `lerp` and `easeOutBack`
// once lived here too; deleted as unused. Re-add when an attack kind needs
// them; until then they're dead weight.
export function easeOutQuart(t: number): number {
  return 1 - (1 - t) ** 4;
}
