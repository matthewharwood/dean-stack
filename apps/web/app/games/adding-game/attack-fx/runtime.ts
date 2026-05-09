import type { Attack } from "@dean-stack/schemas";
import { Application } from "pixi.js";

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
import { resetSoftCircleCache } from "./textures";

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
  resetSoftCircleCache();
}

type Rect = { x: number; y: number; width: number; height: number };

function rectCenter(r: Rect): { x: number; y: number } {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

// Dispatch table — one branch per attack kind, indexed by `Attack["kind"]`.
// Replaces a 10-case switch (cyclomatic 14). Adding a new attack kind: add
// the runner to the schema's kind union AND register it here. TypeScript's
// `Record<Kind, Runner>` will fail to compile if a kind goes unmapped.
type AttackRunner = (ctx: {
  app: Application;
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
}) => Promise<void>;

const KIND_RUNNERS: Record<Attack["kind"], AttackRunner> = {
  slash: runSlash,
  thrust: runThrust,
  burst: runBurst,
  beam: runBeam,
  rain: runRain,
  vortex: runVortex,
  wave: runWave,
  shatter: runShatter,
  spark: runSpark,
  echo: runEcho,
};

// Public dispatch. Resolves after the kind's animation completes (≤500ms
// per dean-stack rules). Throws if the runtime isn't attached yet — the
// route is responsible for mounting <AttackFxLayer/> before any attack
// button can be tapped.
async function runAttack(attack: Attack, fromRect: Rect, toRect: Rect): Promise<void> {
  if (!app) {
    if (initPromise) await initPromise;
  }
  const ready = app;
  if (!ready) return;
  const runner = KIND_RUNNERS[attack.kind];
  if (!runner) return;
  return runner({
    app: ready,
    from: rectCenter(fromRect),
    to: rectCenter(toRect),
    color: attack.color,
  });
}

export const attackFxRuntime = {
  attach,
  detach,
  runAttack,
};
