import { Graphics, type Ticker } from "pixi.js";

import { tintedSoftCircle } from "../textures";

import { ATTACK_DURATION_MS, type AttackCtx, easeOutQuart } from "./types";

// Thrust — a straight projectile from attacker to target, a thin tracer
// line behind it, sparks at impact. Reads as a spear / bolt.
export function runThrust(ctx: AttackCtx): Promise<void> {
  const { app, from, to, color } = ctx;

  const tracer = new Graphics();
  app.stage.addChild(tracer);

  const head = tintedSoftCircle(color);
  head.x = from.x;
  head.y = from.y;
  head.scale.set(0.7);
  head.blendMode = "add";
  app.stage.addChild(head);

  const sparks: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    sprite: ReturnType<typeof tintedSoftCircle>;
    age: number;
    life: number;
  }[] = [];

  return new Promise<void>((resolve) => {
    let elapsed = 0;
    let sparked = false;
    const tick = (ticker: Ticker): void => {
      const deltaMS = ticker.deltaMS;
      elapsed += deltaMS;
      const t = Math.min(1, elapsed / ATTACK_DURATION_MS);
      const flight = Math.min(1, elapsed / 280);
      const flightEased = easeOutQuart(flight);
      head.x = from.x + (to.x - from.x) * flightEased;
      head.y = from.y + (to.y - from.y) * flightEased;
      head.alpha = flight < 1 ? 1 : Math.max(0, 1 - (t - 0.56) / 0.3);
      head.scale.set(0.7 + flight * 0.3);

      tracer.clear();
      tracer.moveTo(from.x, from.y);
      tracer.lineTo(head.x, head.y);
      tracer.stroke({ width: 4, color, alpha: 0.7 * (1 - t * 0.6), cap: "round" });

      if (!sparked && flight >= 0.95) {
        sparked = true;
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
          const speed = 1.2 + Math.random() * 0.8;
          const s = tintedSoftCircle(color);
          s.x = to.x;
          s.y = to.y;
          s.scale.set(0.3);
          s.blendMode = "add";
          app.stage.addChild(s);
          sparks.push({
            x: to.x,
            y: to.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            sprite: s,
            age: 0,
            life: 200,
          });
        }
      }

      const dt = deltaMS / 16;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        if (!sp) continue;
        sp.age += deltaMS;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.sprite.x = sp.x;
        sp.sprite.y = sp.y;
        sp.sprite.alpha = Math.max(0, 1 - sp.age / sp.life);
        if (sp.age >= sp.life) {
          sp.sprite.destroy();
          sparks.splice(i, 1);
        }
      }

      if (t >= 1) {
        app.ticker.remove(tick);
        tracer.destroy();
        head.destroy();
        for (const sp of sparks) sp.sprite.destroy();
        resolve();
      }
    };
    app.ticker.add(tick);
  });
}
