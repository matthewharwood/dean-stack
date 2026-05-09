import type { Ticker } from "pixi.js";

import { tintedSoftCircle } from "../textures";

import { ATTACK_DURATION_MS, type AttackCtx, easeOutQuart } from "./types";

// Burst — radial outward particles centered on the target. Reads as a
// shrapnel detonation: 24 motes shoot in a uniform circle, decelerate,
// fade. Most particle-dense kind in the catalog.
export function runBurst(ctx: AttackCtx): Promise<void> {
  const { app, to, color } = ctx;
  const COUNT = 24;
  const motes: {
    sprite: ReturnType<typeof tintedSoftCircle>;
    vx: number;
    vy: number;
  }[] = [];

  for (let i = 0; i < COUNT; i++) {
    const angle = (Math.PI * 2 * i) / COUNT + Math.random() * 0.2;
    const speed = 4 + Math.random() * 3;
    const s = tintedSoftCircle(color);
    s.x = to.x;
    s.y = to.y;
    s.scale.set(0.3 + Math.random() * 0.5);
    s.blendMode = "add";
    app.stage.addChild(s);
    motes.push({ sprite: s, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
  }

  return new Promise<void>((resolve) => {
    let elapsed = 0;
    const tick = (ticker: Ticker): void => {
      const deltaMS = ticker.deltaMS;
      elapsed += deltaMS;
      const t = Math.min(1, elapsed / ATTACK_DURATION_MS);
      const eased = easeOutQuart(t);
      const dt = deltaMS / 16;
      const drag = 1 - 0.06 * dt;
      for (const m of motes) {
        m.vx *= drag;
        m.vy *= drag;
        m.sprite.x += m.vx * dt;
        m.sprite.y += m.vy * dt;
        m.sprite.alpha = Math.max(0, 1 - eased);
        m.sprite.scale.set(m.sprite.scale.x * (1 + 0.01 * dt));
      }
      if (t >= 1) {
        app.ticker.remove(tick);
        for (const m of motes) m.sprite.destroy();
        resolve();
      }
    };
    app.ticker.add(tick);
  });
}
