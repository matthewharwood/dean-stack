import type { Attack } from "@dean-stack/schemas";
import { Application, BlurFilter, Container, Sprite, Texture } from "pixi.js";

import { runBeam } from "./kinds/beam";
import { runBurst } from "./kinds/burst";
import { runEcho } from "./kinds/echo";
import { runRain } from "./kinds/rain";
import { runShatter } from "./kinds/shatter";
import { runSlash } from "./kinds/slash";
import { runSpark } from "./kinds/spark";
import { runThrust } from "./kinds/thrust";
import { runVortex } from "./kinds/vortex";
import { runWave } from "./kinds/wave";

// Singleton Pixi runtime that owns the full-viewport overlay canvas. The
// route mounts <AttackFxLayer/> once; that component calls `attach(canvas)`
// here to bind. Attack buttons call `runAttack(...)` and `await` the
// returned Promise — the function adds Sprites/Containers to the stage,
// drives them via the Pixi Ticker for ≤500ms, and resolves on completion.
//
// Why singleton: each attack creating + tearing down its own Pixi app
// would cost ~50ms init per click and never warm up the GPU. One
// long-lived app, many short-lived particle effects, gives consistent
// 60fps.
//
// Pixi is a side channel (per dean-stack rules); this module is called
// from event handlers, not render. React only owns the canvas DOM node.

let app: Application | null = null;
let initPromise: Promise<Application> | null = null;
let softCircleTexCache: Texture | null = null;

async function attach(canvas: HTMLCanvasElement): Promise<void> {
  if (app || initPromise) return;
  initPromise = (async () => {
    const next = new Application();
    await next.init({
      canvas,
      resizeTo: canvas.parentElement ?? canvas,
      antialias: true,
      preference: "webgl",
      backgroundAlpha: 0,
      autoStart: true,
    });
    app = next;
    return next;
  })();
  await initPromise;
}

function detach(): void {
  if (app) {
    app.destroy(true, { children: true, texture: false });
    app = null;
  }
  initPromise = null;
  softCircleTexCache = null;
}

// Re-used soft-circle texture for every kind that wants a glow particle.
// Generated once at module load (well, on first request) and shared.
function softCircleTexture(): Texture {
  if (softCircleTexCache) return softCircleTexCache;
  if (typeof document === "undefined") return Texture.EMPTY;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Texture.EMPTY;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.45, "rgba(255,255,255,0.6)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  softCircleTexCache = Texture.from(canvas);
  return softCircleTexCache;
}

// Convenience wrapper for kinds that want a tinted soft-circle sprite.
export function tintedSoftCircle(color: string): Sprite {
  const sprite = new Sprite(softCircleTexture());
  sprite.anchor.set(0.5);
  sprite.tint = color;
  return sprite;
}

// Kind-shared helper — exposed so individual kind files don't each
// re-create the bloom layer. Adds a glow Container to the app.stage
// with additive blend + BlurFilter, returns it so callers can add
// children. Caller must `destroy()` it when their attack ends.
export function makeGlowLayer(blurStrength = 6): Container {
  if (!app) throw new Error("attack-fx: makeGlowLayer called before attach()");
  const c = new Container();
  c.blendMode = "add";
  c.filters = [new BlurFilter({ strength: blurStrength, quality: 2, resolution: 1 })];
  app.stage.addChild(c);
  return c;
}

export type Rect = { x: number; y: number; width: number; height: number };

function rectCenter(r: Rect): { x: number; y: number } {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

// Public dispatch. Resolves after the kind's animation completes (≤500ms
// per dean-stack rules). Throws if the runtime isn't attached yet — the
// route is responsible for mounting <AttackFxLayer/> before any attack
// button can be tapped.
export async function runAttack(attack: Attack, fromRect: Rect, toRect: Rect): Promise<void> {
  if (!app) {
    if (initPromise) await initPromise;
  }
  const ready = app;
  if (!ready) return;

  const from = rectCenter(fromRect);
  const to = rectCenter(toRect);

  const ctx = { app: ready, from, to, color: attack.color };

  switch (attack.kind) {
    case "slash":
      return runSlash(ctx);
    case "thrust":
      return runThrust(ctx);
    case "burst":
      return runBurst(ctx);
    case "beam":
      return runBeam(ctx);
    case "rain":
      return runRain(ctx);
    case "vortex":
      return runVortex(ctx);
    case "wave":
      return runWave(ctx);
    case "shatter":
      return runShatter(ctx);
    case "spark":
      return runSpark(ctx);
    case "echo":
      return runEcho(ctx);
    default:
      return;
  }
}

export const attackFxRuntime = {
  attach,
  detach,
  runAttack,
};
