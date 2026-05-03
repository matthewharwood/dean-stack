import { Graphics, type Ticker } from "pixi.js";

import { ATTACK_DURATION_MS, type AttackCtx, easeOutQuart } from "./types";

// Wave — three concentric rings expanding from the target, like a sonar
// pulse. Each ring is offset in start time and fades as it grows.
export function runWave(ctx: AttackCtx): Promise<void> {
  const { app, to, color } = ctx;

  const rings: { graphic: Graphics; delay: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const g = new Graphics();
    g.x = to.x;
    g.y = to.y;
    g.blendMode = "add";
    app.stage.addChild(g);
    rings.push({ graphic: g, delay: i * 90 });
  }

  return new Promise<void>((resolve) => {
    let elapsed = 0;
    const tick = (ticker: Ticker): void => {
      const deltaMS = ticker.deltaMS;
      elapsed += deltaMS;
      const t = Math.min(1, elapsed / ATTACK_DURATION_MS);
      for (const r of rings) {
        const local = elapsed - r.delay;
        if (local < 0) {
          r.graphic.clear();
          continue;
        }
        const u = Math.min(1, local / 360);
        const eased = easeOutQuart(u);
        const radius = 12 + eased * 140;
        const alpha = Math.max(0, 1 - u);
        r.graphic.clear();
        r.graphic.circle(0, 0, radius);
        r.graphic.stroke({ width: 4 * (1 - u * 0.6), color, alpha: alpha * 0.9 });
      }
      if (t >= 1) {
        app.ticker.remove(tick);
        for (const r of rings) r.graphic.destroy();
        resolve();
      }
    };
    app.ticker.add(tick);
  });
}
