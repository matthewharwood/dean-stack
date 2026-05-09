import { type Application, Container, FillGradient, Graphics, Sprite, Texture } from "pixi.js";
import { useRef } from "react";

import { usePixiApp } from "~/canvas/use-pixi-app";

// ─── Tunables ────────────────────────────────────────────────────────────
// Eight seconds of descent: a slow drop from sun-warmed surface water
// (cream + lantern light) into the abyssal trench (near-black with sparse
// bioluminescence). The depth gradient + light shafts paint as Graphics
// every frame; particles ride on top.
const DURATION_MS = 8000;
const FADE_IN_MS = 600;
const FADE_OUT_START_MS = 7300;

// Spawn rates at peak. The intro keeps rates moderate so the visual
// doesn't get muddy — the kid should *feel* the descent, not be flooded.
const BUBBLES_PER_TICK = 1.5; // rising from bottom
const SNOW_PER_TICK = 1.5; // falling slowly
const GLOW_PER_TICK = 0.4; // sparse bioluminescent motes

// ─── Texture generation ─────────────────────────────────────────────────
function makeSoftCircleTexture(size: number, r: number, g: number, b: number): Texture {
  if (typeof document === "undefined") return Texture.EMPTY;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Texture.EMPTY;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
  gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.55)`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(canvas);
}

function makeBubbleTexture(size: number): Texture {
  if (typeof document === "undefined") return Texture.EMPTY;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Texture.EMPTY;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(220, 245, 255, 0)");
  gradient.addColorStop(0.55, "rgba(220, 245, 255, 0.15)");
  gradient.addColorStop(0.78, "rgba(220, 245, 255, 0.7)");
  gradient.addColorStop(1, "rgba(220, 245, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(canvas);
}

// Color stops for the depth gradient. Each row is [r, g, b] in 0–255.
// The top-of-screen color samples slightly shallower than the bottom-
// of-screen, giving the gradient that "the surface is still up there"
// feel through the descent.
const COLOR_STOPS: ReadonlyArray<readonly [number, number, number]> = [
  [245, 232, 199], // surface cream
  [76, 165, 199], // sky-aqua
  [51, 140, 178], // teal
  [15, 36, 87], // navy
  [3, 5, 15], // abyss
];

function depthRgb(t: number): [number, number, number] {
  const seg = Math.max(0, Math.min(t, 1)) * (COLOR_STOPS.length - 1);
  const i = Math.min(Math.floor(seg), COLOR_STOPS.length - 2);
  const f = seg - i;
  const a = COLOR_STOPS[i] ?? COLOR_STOPS[0];
  const b = COLOR_STOPS[i + 1] ?? a;
  if (!a || !b) return [0, 0, 0];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

function rgbToHex(r: number, g: number, b: number): number {
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

// ─── Particle bookkeeping ───────────────────────────────────────────────
type ParticleKind = "bubble" | "snow" | "glow";
type Particle = {
  sprite: Sprite;
  vx: number;
  vy: number;
  swayBase: number;
  swaySpeed: number;
  age: number;
  fadeIn: number;
  baseAlpha: number;
  kind: ParticleKind;
};

type IntroRefs = {
  onComplete: () => void;
  done: boolean;
};

function buildScene(app: Application, refs: IntroRefs): () => void {
  const W = app.screen.width;
  const H = app.screen.height;

  // ── Background depth gradient (Graphics, redrawn each frame) ─────────
  // Vertical FillGradient from a "top color" (one stop ahead-of-depth)
  // to a "bottom color" (one stop behind-depth). As `depth` ramps over
  // 7s the gradient slides through the COLOR_STOPS table — the kid sees
  // the slice of water they're falling through. Painting as a Graphics
  // rectangle means we never depend on canvas-clear-color or filters.
  const background = new Graphics();
  app.stage.addChild(background);

  // ── Light shafts (Graphics, redrawn each frame) ─────────────────────
  // Four narrow vertical translucent rectangles in the top half of the
  // viewport, swaying horizontally over time. Fades out as depth → 1.
  const shafts = new Graphics();
  app.stage.addChild(shafts);

  // Particle layers
  const bubbleLayer = new Container();
  bubbleLayer.blendMode = "add";
  app.stage.addChild(bubbleLayer);

  const snowLayer = new Container();
  app.stage.addChild(snowLayer);

  const glowLayer = new Container();
  glowLayer.blendMode = "add";
  app.stage.addChild(glowLayer);

  // Lantern reveal — a single warm vellum (#F4E4C1) blob centered
  // horizontally, slightly below center. Fades in over the last 1.8s
  // as the kid "lands" at the trench bottom and their lantern ignites.
  const lanternTex = makeSoftCircleTexture(256, 244, 228, 193);
  const lantern = new Sprite(lanternTex);
  lantern.anchor.set(0.5);
  lantern.x = W / 2;
  lantern.y = H * 0.62;
  lantern.scale.set(2.5);
  lantern.alpha = 0;
  lantern.blendMode = "add";
  app.stage.addChild(lantern);

  // Textures
  const bubbleTex = makeBubbleTexture(28);
  const snowTex = makeSoftCircleTexture(14, 240, 240, 230);
  const glowTex = makeSoftCircleTexture(36, 110, 220, 250);

  function paintBackground(depth: number): void {
    const topD = Math.max(0, depth - 0.08);
    const botD = Math.min(1, depth + 0.08);
    const top = depthRgb(topD);
    const bot = depthRgb(botD);
    const grad = new FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 0, y: H },
      colorStops: [
        { offset: 0, color: rgbToHex(top[0], top[1], top[2]) },
        { offset: 1, color: rgbToHex(bot[0], bot[1], bot[2]) },
      ],
      textureSpace: "global",
    });
    background.clear();
    background.rect(0, 0, W, H).fill(grad);
  }

  function paintShafts(time: number, depth: number): void {
    shafts.clear();
    const intensity = Math.max(0, 1 - depth) * 0.55;
    if (intensity <= 0.01) return;
    const yFadeHeight = H * 0.65;
    const strokes: Array<{ x: number; width: number }> = [
      { x: 0.18 * W + Math.sin(time * 0.4) * (0.04 * W), width: 0.03 * W },
      { x: 0.42 * W + Math.sin(time * 0.55 + 1.3) * (0.05 * W), width: 0.04 * W },
      { x: 0.68 * W + Math.sin(time * 0.45 + 2.7) * (0.03 * W), width: 0.03 * W },
      { x: 0.86 * W + Math.sin(time * 0.38 + 4.1) * (0.04 * W), width: 0.025 * W },
    ];
    for (const stroke of strokes) {
      shafts
        .rect(stroke.x - stroke.width / 2, 0, stroke.width, yFadeHeight)
        .fill({ color: 0xf4e4c1, alpha: intensity });
    }
  }

  const particles: Particle[] = [];

  function spawnBubble(): void {
    const sprite = new Sprite(bubbleTex);
    sprite.anchor.set(0.5);
    sprite.x = Math.random() * W;
    sprite.y = H + Math.random() * 60 + 20;
    const s = 0.25 + Math.random() * 0.85;
    sprite.scale.set(s);
    sprite.alpha = 0;
    bubbleLayer.addChild(sprite);
    particles.push({
      sprite,
      vy: -(0.6 + Math.random() * 1.2),
      vx: (Math.random() - 0.5) * 0.15,
      swayBase: Math.random() * 1000,
      swaySpeed: 0.0015 + Math.random() * 0.001,
      age: 0,
      fadeIn: 250 + Math.random() * 300,
      baseAlpha: 0.45 + Math.random() * 0.35,
      kind: "bubble",
    });
  }

  function spawnSnow(): void {
    const sprite = new Sprite(snowTex);
    sprite.anchor.set(0.5);
    sprite.x = Math.random() * W;
    sprite.y = -Math.random() * 30 - 10;
    const s = 0.25 + Math.random() * 0.45;
    sprite.scale.set(s);
    sprite.alpha = 0;
    snowLayer.addChild(sprite);
    particles.push({
      sprite,
      vy: 0.4 + Math.random() * 0.5,
      vx: (Math.random() - 0.5) * 0.12,
      swayBase: Math.random() * 1000,
      swaySpeed: 0.0012 + Math.random() * 0.0009,
      age: 0,
      fadeIn: 500 + Math.random() * 400,
      baseAlpha: 0.3 + Math.random() * 0.3,
      kind: "snow",
    });
  }

  function spawnGlow(): void {
    const sprite = new Sprite(glowTex);
    sprite.anchor.set(0.5);
    sprite.x = Math.random() * W;
    sprite.y = -Math.random() * 30 - 10;
    const s = 0.35 + Math.random() * 0.6;
    sprite.scale.set(s);
    sprite.alpha = 0;
    glowLayer.addChild(sprite);
    particles.push({
      sprite,
      vy: 0.25 + Math.random() * 0.4,
      vx: (Math.random() - 0.5) * 0.08,
      swayBase: Math.random() * 1000,
      swaySpeed: 0.0009 + Math.random() * 0.0007,
      age: 0,
      fadeIn: 700 + Math.random() * 400,
      baseAlpha: 0.55 + Math.random() * 0.3,
      kind: "glow",
    });
  }

  // Paint the first frame immediately so the kid sees the surface
  // gradient + shafts before the ticker kicks in.
  paintBackground(0);
  paintShafts(0, 0);

  let elapsed = 0;
  let bubbleAcc = 0;
  let snowAcc = 0;
  let glowAcc = 0;

  app.ticker.add((ticker) => {
    elapsed += ticker.deltaMS;
    const t = elapsed / 1000;

    // Depth ramps from 0 (surface) to 1 (abyss) over 0.85 of the
    // duration, then stays at 1 for the lantern reveal.
    const depth = Math.min(1, elapsed / (DURATION_MS * 0.85));

    // Overall intensity envelope.
    const fadeIn = Math.min(1, elapsed / FADE_IN_MS);
    const fadeOut =
      elapsed < FADE_OUT_START_MS
        ? 1
        : Math.max(0, 1 - (elapsed - FADE_OUT_START_MS) / (DURATION_MS - FADE_OUT_START_MS));
    const intensity = fadeIn * fadeOut;
    app.stage.alpha = intensity;

    paintBackground(depth);
    paintShafts(t, depth);

    // Lantern reveal — fades in over last 1.8s, peaks just before
    // overall fade-out kicks in.
    const lanternStart = DURATION_MS - 2200;
    if (elapsed > lanternStart) {
      const t2 = (elapsed - lanternStart) / 1500;
      lantern.alpha = Math.min(0.85, t2);
    }

    // Spawn — bubble/snow rates ramp up slightly with depth so the
    // density grows as we descend. Glow only appears after midway.
    const bubbleFactor = 0.4 + depth * 0.6;
    const snowFactor = 0.3 + depth * 0.7;
    const glowFactor = depth > 0.45 ? Math.min(1, (depth - 0.45) * 2) : 0;

    bubbleAcc += BUBBLES_PER_TICK * bubbleFactor * (ticker.deltaMS / 16);
    while (bubbleAcc > 1) {
      spawnBubble();
      bubbleAcc -= 1;
    }
    snowAcc += SNOW_PER_TICK * snowFactor * (ticker.deltaMS / 16);
    while (snowAcc > 1) {
      spawnSnow();
      snowAcc -= 1;
    }
    glowAcc += GLOW_PER_TICK * glowFactor * (ticker.deltaMS / 16);
    while (glowAcc > 1) {
      spawnGlow();
      glowAcc -= 1;
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (!p) continue;
      // Cache `p.sprite` once per iteration — this loop runs every frame
      // for every particle (~hundreds), and each `p.sprite` access is a
      // property chain on a Pixi Container.
      const sprite = p.sprite;
      p.age += ticker.deltaMS;
      const dt = ticker.deltaMS / 16;
      sprite.x += p.vx * dt + Math.sin((p.age + p.swayBase) * p.swaySpeed) * 0.4 * dt;
      sprite.y += p.vy * dt;

      let alpha = p.baseAlpha;
      if (p.age < p.fadeIn) alpha *= p.age / p.fadeIn;

      if (p.kind === "bubble") {
        if (sprite.y < H * 0.2) alpha *= Math.max(0, sprite.y / (H * 0.2));
      } else {
        if (sprite.y > H * 0.85) alpha *= Math.max(0, (H - sprite.y) / (H * 0.15));
      }
      sprite.alpha = Math.max(0, alpha);

      const offTop = p.kind === "bubble" && sprite.y < -20;
      const offBottom = p.kind !== "bubble" && sprite.y > H + 20;
      if (offTop || offBottom || (p.age > 1500 && sprite.alpha <= 0.005)) {
        if (p.kind === "bubble") bubbleLayer.removeChild(sprite);
        else if (p.kind === "snow") snowLayer.removeChild(sprite);
        else glowLayer.removeChild(sprite);
        sprite.destroy();
        particles.splice(i, 1);
      }
    }

    if (!refs.done && elapsed >= DURATION_MS) {
      refs.done = true;
      refs.onComplete();
    }
  });

  return () => {
    // Cleanup is handled by app.destroy() in usePixiApp.
  };
}

// ─── Component ──────────────────────────────────────────────────────────
export function DiveInIntro({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const refs = useRef<IntroRefs>({ onComplete, done: false });
  refs.current.onComplete = onComplete;

  usePixiApp(
    canvasRef,
    (app, { reducedMotion }) => {
      if (reducedMotion) {
        // Reduced motion: no descent, fire onComplete immediately so the
        // game starts without stalling.
        const t = window.setTimeout(() => refs.current.onComplete(), 80);
        return () => window.clearTimeout(t);
      }
      refs.current.done = false;
      return buildScene(app, refs.current);
    },
    [],
  );

  // Tap-to-skip — useful for repeat plays.
  function handleSkip(): void {
    if (!refs.current.done) {
      refs.current.done = true;
      refs.current.onComplete();
    }
  }

  // Wrapper is `<div>`-based with the canvas as its block child. A
  // separate transparent <button> is laid over it for tap-to-skip so
  // the canvas's intrinsic block layout is never altered by button
  // styling resets.
  return (
    <div className="fixed inset-0 z-50" data-test="dive-in-intro">
      <canvas ref={canvasRef} className="block size-full" />
      <button
        type="button"
        className="absolute inset-0 cursor-pointer border-0 bg-transparent p-0"
        onClick={handleSkip}
        aria-label="Skip intro"
      />
    </div>
  );
}
