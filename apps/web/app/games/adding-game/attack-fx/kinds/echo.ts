import { Graphics, type Ticker } from "pixi.js";

import { tintedSoftCircle } from "../textures";

import { ATTACK_DURATION_MS, type AttackCtx, easeOutQuart } from "./types";

// Echo — a sequence of overlapping ring pulses radiating from the
// attacker, traveling outward and washing across the target. Reads as
// sound / sonar — five offset rings + a soft core glow at impact.
export function runEcho(ctx: AttackCtx): Promise<void> {
  const { app, from, to, color } = ctx;
  const RING_COUNT = 5;
  const rings: { graphic: Graphics; delay: number }[] = [];
  for (let i = 0; i < RING_COUNT; i++) {
    const g = new Graphics();
    g.x = from.x;
    g.y = from.y;
    g.blendMode = "add";
    app.stage.addChild(g);
    rings.push({ graphic: g, delay: i * 60 });
  }

  const reach = Math.hypot(to.x - from.x, to.y - from.y) + 60;

  const impact = tintedSoftCircle(color);
  impact.x = to.x;
  impact.y = to.y;
  impact.scale.set(0);
  impact.blendMode = "add";
  impact.alpha = 0;
  app.stage.addChild(impact);

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
        const u = Math.min(1, local / 380);
        const eased = easeOutQuart(u);
        const radius = 16 + eased * reach;
        const alpha = Math.max(0, (1 - u) * 0.8);
        r.graphic.clear();
        r.graphic.circle(0, 0, radius);
        r.graphic.stroke({ width: 3 * (1 - u * 0.5), color, alpha });
      }
      // Impact glow rises after 60% — the wave reaches the target.
      if (t > 0.6) {
        const u = Math.min(1, (t - 0.6) / 0.4);
        impact.scale.set(0.6 + u * 1.4);
        impact.alpha = u < 0.4 ? u * 2.2 : Math.max(0, 0.88 - (u - 0.4) / 0.6);
      }
      if (t >= 1) {
        app.ticker.remove(tick);
        for (const r of rings) r.graphic.destroy();
        impact.destroy();
        resolve();
      }
    };
    app.ticker.add(tick);
  });
}
