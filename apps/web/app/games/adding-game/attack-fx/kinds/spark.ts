import type { Ticker } from "pixi.js";

import { tintedSoftCircle } from "../runtime";

import { ATTACK_DURATION_MS, type AttackCtx, easeOutQuart } from "./types";

// Spark — small fast glints converging on the target from random
// directions, then a tight pop at impact. Reads as electric/static —
// many tiny lights, brief bright finish.
export function runSpark(ctx: AttackCtx): Promise<void> {
  const { app, to, color } = ctx;
  const COUNT = 16;
  const startRadius = 130;
  const motes: {
    sprite: ReturnType<typeof tintedSoftCircle>;
    sx: number;
    sy: number;
    delay: number;
  }[] = [];

  for (let i = 0; i < COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = startRadius + (Math.random() - 0.5) * 40;
    const sx = to.x + Math.cos(angle) * radius;
    const sy = to.y + Math.sin(angle) * radius;
    const s = tintedSoftCircle(color);
    s.scale.set(0.18 + Math.random() * 0.18);
    s.blendMode = "add";
    s.x = sx;
    s.y = sy;
    s.alpha = 0;
    app.stage.addChild(s);
    motes.push({ sprite: s, sx, sy, delay: Math.random() * 120 });
  }

  const flash = tintedSoftCircle(color);
  flash.x = to.x;
  flash.y = to.y;
  flash.scale.set(0);
  flash.blendMode = "add";
  flash.alpha = 0;
  app.stage.addChild(flash);

  return new Promise<void>((resolve) => {
    let elapsed = 0;
    const tick = (ticker: Ticker): void => {
      const deltaMS = ticker.deltaMS;
      elapsed += deltaMS;
      const t = Math.min(1, elapsed / ATTACK_DURATION_MS);
      for (const m of motes) {
        const local = elapsed - m.delay;
        if (local < 0) continue;
        const u = Math.min(1, local / 280);
        const eased = easeOutQuart(u);
        m.sprite.x = m.sx + (to.x - m.sx) * eased;
        m.sprite.y = m.sy + (to.y - m.sy) * eased;
        m.sprite.alpha = u < 0.85 ? Math.min(1, u * 2.5) : Math.max(0, 1 - (u - 0.85) * 6);
      }
      // Flash punches in around 0.55–0.7, fades by end.
      if (t > 0.55) {
        const u = Math.min(1, (t - 0.55) / 0.45);
        flash.scale.set(0.4 + u * 1.6);
        flash.alpha = u < 0.3 ? u * 3 : Math.max(0, 1 - (u - 0.3) / 0.7);
      }
      if (t >= 1) {
        app.ticker.remove(tick);
        for (const m of motes) m.sprite.destroy();
        flash.destroy();
        resolve();
      }
    };
    app.ticker.add(tick);
  });
}
