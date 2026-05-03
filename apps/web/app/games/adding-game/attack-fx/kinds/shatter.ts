import { Graphics } from "pixi.js";

import { ATTACK_DURATION_MS, type AttackCtx, easeOutQuart } from "./types";

// Shatter — angular shards erupt outward from the target and tumble.
// Reads as crystal/glass breaking. Uses Graphics triangles, not soft
// circles, so the silhouettes stay crisp and "broken."
export function runShatter(ctx: AttackCtx): Promise<void> {
  const { app, to, color } = ctx;
  const COUNT = 12;
  const shards: {
    graphic: Graphics;
    vx: number;
    vy: number;
    spin: number;
  }[] = [];

  for (let i = 0; i < COUNT; i++) {
    const angle = (Math.PI * 2 * i) / COUNT + Math.random() * 0.3;
    const speed = 5 + Math.random() * 4;
    const g = new Graphics();
    const size = 6 + Math.random() * 8;
    g.poly([0, -size, size * 0.6, size * 0.4, -size * 0.4, size * 0.5]);
    g.fill({ color, alpha: 0.95 });
    g.x = to.x;
    g.y = to.y;
    g.rotation = Math.random() * Math.PI * 2;
    g.blendMode = "add";
    app.stage.addChild(g);
    shards.push({
      graphic: g,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spin: (Math.random() - 0.5) * 0.4,
    });
  }

  return new Promise<void>((resolve) => {
    let elapsed = 0;
    const tick = (deltaMS: number): void => {
      elapsed += deltaMS;
      const t = Math.min(1, elapsed / ATTACK_DURATION_MS);
      const eased = easeOutQuart(t);
      const dt = deltaMS / 16;
      for (const s of shards) {
        s.vy += 0.4 * dt; // gravity
        s.graphic.x += s.vx * dt;
        s.graphic.y += s.vy * dt;
        s.graphic.rotation += s.spin * dt;
        s.graphic.alpha = Math.max(0, 1 - eased);
      }
      if (t >= 1) {
        app.ticker.remove(tick);
        for (const s of shards) s.graphic.destroy();
        resolve();
      }
    };
    app.ticker.add((ticker) => tick(ticker.deltaMS));
  });
}
