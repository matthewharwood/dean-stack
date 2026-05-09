import type { Ticker } from "pixi.js";

import { tintedSoftCircle } from "../textures";

import { ATTACK_DURATION_MS, type AttackCtx } from "./types";

// Rain — droplets fall from above the target, converging onto it. Reads
// as a column of strikes from the sky. ~14 drops, staggered start times.
export function runRain(ctx: AttackCtx): Promise<void> {
  const { app, to, color } = ctx;
  const COUNT = 14;
  const drops: {
    sprite: ReturnType<typeof tintedSoftCircle>;
    x: number;
    targetY: number;
    delay: number;
    duration: number;
  }[] = [];

  for (let i = 0; i < COUNT; i++) {
    const offsetX = (Math.random() - 0.5) * 140;
    const s = tintedSoftCircle(color);
    s.x = to.x + offsetX;
    s.y = to.y - 240 - Math.random() * 80;
    s.scale.set(0.25 + Math.random() * 0.35);
    s.blendMode = "add";
    s.alpha = 0;
    app.stage.addChild(s);
    drops.push({
      sprite: s,
      x: to.x + offsetX,
      targetY: to.y + (Math.random() - 0.5) * 30,
      delay: Math.random() * 200,
      duration: 200 + Math.random() * 100,
    });
  }

  return new Promise<void>((resolve) => {
    let elapsed = 0;
    const tick = (ticker: Ticker): void => {
      const deltaMS = ticker.deltaMS;
      elapsed += deltaMS;
      const overall = Math.min(1, elapsed / ATTACK_DURATION_MS);
      for (const d of drops) {
        const local = elapsed - d.delay;
        if (local < 0) continue;
        const u = Math.min(1, local / d.duration);
        // Fall path: from above to target, ease-in for gravity feel.
        const startY = to.y - 240;
        d.sprite.y = startY + (d.targetY - startY) * (u * u);
        d.sprite.x = d.x;
        d.sprite.alpha = u < 0.85 ? 0.85 : Math.max(0, 0.85 - (u - 0.85) * 5);
      }
      if (overall >= 1) {
        app.ticker.remove(tick);
        for (const d of drops) d.sprite.destroy();
        resolve();
      }
    };
    app.ticker.add(tick);
  });
}
