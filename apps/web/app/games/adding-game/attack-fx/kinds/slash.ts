import { Graphics, type Ticker } from "pixi.js";

import { tintedSoftCircle } from "../textures";

import { ATTACK_DURATION_MS, type AttackCtx, easeOutQuart } from "./types";

// Slash — a wide diagonal arc swept across the target with motion-blurred
// trail particles. Reads as a sword cut. Two phases: (a) the leading edge
// sweeps from one corner of the target to the opposite over 220ms;
// (b) the bright stroke fades while particles drift outward.
export function runSlash(ctx: AttackCtx): Promise<void> {
  const { app, to, color } = ctx;

  const halfW = 90;
  const halfH = 90;
  // Slash axis: diagonal from upper-left to lower-right of the target.
  const ax = -halfW;
  const ay = -halfH;
  const bx = halfW;
  const by = halfH;

  const stroke = new Graphics();
  stroke.x = to.x;
  stroke.y = to.y;
  stroke.alpha = 0;
  app.stage.addChild(stroke);

  const trail = tintedSoftCircle(color);
  trail.x = to.x + ax;
  trail.y = to.y + ay;
  trail.scale.set(0.4);
  trail.blendMode = "add";
  trail.alpha = 0;
  app.stage.addChild(trail);

  return new Promise<void>((resolve) => {
    let elapsed = 0;
    const tick = (ticker: Ticker): void => {
      const deltaMS = ticker.deltaMS;
      elapsed += deltaMS;
      const t = Math.min(1, elapsed / ATTACK_DURATION_MS);
      // Lead head (220ms) — the bright tip racing across.
      const head = Math.min(1, elapsed / 220);
      const headEased = easeOutQuart(head);
      const tipX = ax + (bx - ax) * headEased;
      const tipY = ay + (by - ay) * headEased;
      trail.x = to.x + tipX;
      trail.y = to.y + tipY;
      trail.alpha = head < 1 ? 0.9 * head : Math.max(0, 1 - (t - 0.44) / 0.4);
      trail.scale.set(0.4 + headEased * 0.7);

      // Stroke trail — re-drawn each frame from start to current tip.
      stroke.clear();
      const widthLead = 12 * (1 - t * 0.5);
      stroke.moveTo(ax, ay);
      stroke.lineTo(tipX, tipY);
      stroke.stroke({ width: widthLead, color, alpha: 0.85 * (1 - t * 0.7), cap: "round" });
      stroke.alpha = 1;

      if (t >= 1) {
        app.ticker.remove(tick);
        stroke.destroy();
        trail.destroy();
        resolve();
      }
    };
    app.ticker.add(tick);
  });
}
