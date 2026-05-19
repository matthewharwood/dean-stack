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
// route keeps <AttackFxLayer/> as a marker, but the canvas and Pixi app are
// created lazily on first attack. Attack buttons call `runAttack(...)` and
// `await` the returned Promise — the function adds Sprites/Containers to the
// stage, drives them via the Pixi Ticker for ≤500ms, and resolves on completion.
//
// The app is torn down after each attack. That costs a small init on the next
// attack, but it avoids keeping an idle full-screen canvas/WebGL context alive
// on localhost desktop browsers.
//
// Pixi is a side channel (per dean-stack rules); this module is called
// from event handlers, not render.

let app: Application | null = null;
let initPromise: Promise<Application | null> | null = null;
let host: HTMLDivElement | null = null;
let canvas: HTMLCanvasElement | null = null;

function ensureCanvas(): HTMLCanvasElement | null {
  if (canvas?.isConnected) return canvas;
  if (typeof document === "undefined") return null;
  host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.setAttribute("data-test", "attack-fx-layer");
  host.className = "pointer-events-none fixed inset-0 z-30";
  canvas = document.createElement("canvas");
  canvas.className = "block size-full";
  host.appendChild(canvas);
  document.body.appendChild(host);
  return canvas;
}

async function ensureApp(): Promise<Application | null> {
  if (app) return app;
  if (initPromise) return initPromise;
  const nextCanvas = ensureCanvas();
  if (!nextCanvas) return null;
  initPromise = (async () => {
    const next = new Application();
    try {
      await next.init({
        canvas: nextCanvas,
        resizeTo: nextCanvas.parentElement ?? nextCanvas,
        antialias: true,
        preference: "webgl",
        backgroundAlpha: 0,
        autoStart: true,
      });
      if (canvas !== nextCanvas) {
        next.destroy(true, { children: true, texture: false });
        return null;
      }
      app = next;
      return next;
    } catch {
      next.destroy(true, { children: true, texture: false });
      return null;
    } finally {
      initPromise = null;
    }
  })();
  return initPromise;
}

function detach(): void {
  if (app) {
    app.destroy(true, { children: true, texture: false });
    app = null;
  }
  initPromise = null;
  host?.remove();
  host = null;
  canvas = null;
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
// route keeps <AttackFxLayer/> as a marker, but the overlay itself is created
// lazily here so route entry does not allocate an idle full-screen canvas.
async function runAttack(attack: Attack, fromRect: Rect, toRect: Rect): Promise<void> {
  const ready = app ?? (await ensureApp());
  if (!ready) return;
  const runner = KIND_RUNNERS[attack.kind];
  if (!runner) return;
  try {
    return await runner({
      app: ready,
      from: rectCenter(fromRect),
      to: rectCenter(toRect),
      color: attack.color,
    });
  } finally {
    detach();
  }
}

export const attackFxRuntime = {
  detach,
  runAttack,
};
