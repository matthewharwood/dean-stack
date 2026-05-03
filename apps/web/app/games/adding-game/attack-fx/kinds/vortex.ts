import { tintedSoftCircle } from "../runtime";

import { ATTACK_DURATION_MS, type AttackCtx, easeOutQuart } from "./types";

// Vortex — particles spiral inward toward the target, accelerating as
// they close in, then collapse into a flash. Reads as a black-hole pull.
export function runVortex(ctx: AttackCtx): Promise<void> {
  const { app, to, color } = ctx;
  const COUNT = 18;
  const startRadius = 160;
  const motes: {
    sprite: ReturnType<typeof tintedSoftCircle>;
    angle: number;
    radius: number;
  }[] = [];

  for (let i = 0; i < COUNT; i++) {
    const angle = (Math.PI * 2 * i) / COUNT + Math.random() * 0.4;
    const radius = startRadius + (Math.random() - 0.5) * 50;
    const s = tintedSoftCircle(color);
    s.scale.set(0.25 + Math.random() * 0.35);
    s.blendMode = "add";
    s.x = to.x + Math.cos(angle) * radius;
    s.y = to.y + Math.sin(angle) * radius;
    app.stage.addChild(s);
    motes.push({ sprite: s, angle, radius });
  }

  return new Promise<void>((resolve) => {
    let elapsed = 0;
    const tick = (deltaMS: number): void => {
      elapsed += deltaMS;
      const t = Math.min(1, elapsed / ATTACK_DURATION_MS);
      const eased = easeOutQuart(t);
      // Radius collapses to zero by t=0.85; final 0.15 is the flash.
      const collapse = Math.min(1, t / 0.85);
      const collapseEased = easeOutQuart(collapse);
      for (const m of motes) {
        // Angular velocity ramps up as radius shrinks (ang momentum cheat).
        m.angle += (deltaMS / 16) * (0.05 + (1 - collapseEased) * 0.02 + collapseEased * 0.25);
        const r = m.radius * (1 - collapseEased);
        m.sprite.x = to.x + Math.cos(m.angle) * r;
        m.sprite.y = to.y + Math.sin(m.angle) * r;
        m.sprite.alpha = t < 0.85 ? 1 : Math.max(0, 1 - (t - 0.85) / 0.15);
      }
      void eased;
      if (t >= 1) {
        app.ticker.remove(tick);
        for (const m of motes) m.sprite.destroy();
        resolve();
      }
    };
    app.ticker.add((ticker) => tick(ticker.deltaMS));
  });
}
