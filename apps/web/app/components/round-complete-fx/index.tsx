import {
  type Application,
  BlurFilter,
  Container,
  Filter,
  GlProgram,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  Texture,
  UniformGroup,
} from "pixi.js";
import { useRef } from "react";

import { usePixiApp } from "~/canvas/use-pixi-app";

// ─── Tunables ────────────────────────────────────────────────────────────
// Total visible duration. 8s aligns with what a kid will read as a complete
// "moment" — long enough to feel earned, short enough to not bore. The
// internal lifecycle is: 0–1s ramp-up, 1–7s peak, 7–8s ramp-down. Existing
// particles continue falling for ~2s after spawn stops, so the practical
// tail extends a touch past 8s; the onComplete fires at 8s nonetheless so
// the route can advance state immediately.
const DURATION_MS = 8000;
const RAMP_UP_MS = 1000;
const RAMP_DOWN_START_MS = 7000;

// Per-frame spawn rate at peak. Counts are TOTAL across layers; the layers
// themselves are biased internally (snow >> glow >> gold). Tuned for iPad
// Pro to keep ~600 particles alive at any moment without dropping frames.
const SNOW_PER_TICK = 4;
const GLOW_PER_TICK = 1;
const GOLD_SPAWN_PROBABILITY = 0.04; // per tick — gold is rare

// ─── Texture generation ─────────────────────────────────────────────────
// Soft-edged circles, generated once at startup. RGBA radial gradient on a
// 2D canvas → Pixi Texture. No assets to load, no spritesheet to manage —
// the celebration is fully self-contained.
function makeSoftCircleTexture(size: number, r: number, g: number, b: number): Texture {
  if (typeof document === "undefined") return Texture.EMPTY;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Texture.EMPTY;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
  gradient.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, 0.55)`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(canvas);
}

// ─── Caustic shader ─────────────────────────────────────────────────────
// Stage-level filter that adds a slow, dancing cyan caustic across the
// scene — the kind of light pattern you'd see filtering through a pool's
// surface, dialed WAY back so it reads as "deep underwater" rather than
// "sunny pool." Classic Shadertoy-style nested cos/sin loop. uTime is
// updated each tick from the route component.
//
// GLSL ES 3.0 per dean-stack convention: `in`/`out`, `texture()`,
// `finalColor`. Vertex is the Pixi v8 default filter vertex (transform
// the quad through uOutputFrame/uOutputTexture and pass UVs). Fragment
// adds caustics on top of the rendered scene.
const CAUSTIC_VERTEX = /* glsl */ `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void) {
  return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void) {
  gl_Position = filterVertexPosition();
  vTextureCoord = filterTextureCoord();
}
`;

const CAUSTIC_FRAGMENT = /* glsl */ `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uIntensity;

float caustic(vec2 uv, float t) {
  vec2 p = mod(uv * 6.28318 - 250.0, 6.28318) - 250.0;
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 5; n++) {
    float tn = t * 0.35 * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tn - i.x) + sin(tn + i.y), sin(tn - i.y) + cos(tn + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tn) / inten), p.y / (cos(i.y + tn) / inten)));
  }
  c /= 5.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}

void main(void) {
  vec4 base = texture(uTexture, vTextureCoord);
  float c = caustic(vTextureCoord * 1.6, uTime);
  // Cool cyan tint where the caustic is strong. Multiplied by intensity
  // so the route can ramp it in/out alongside the particle phase.
  vec3 tint = vec3(0.05, 0.13, 0.18) * c * uIntensity;
  finalColor = vec4(base.rgb + tint, base.a);
}
`;

// ─── Particle bookkeeping ───────────────────────────────────────────────
type Layer = "snow" | "glow" | "gold";

type Particle = {
  sprite: Sprite;
  vy: number;
  vx: number;
  swayBase: number;
  swaySpeed: number;
  age: number;
  fadeIn: number; // ms over which to fade in from 0
  baseAlpha: number;
  layer: Layer;
};

// ─── Setup ──────────────────────────────────────────────────────────────
type FxRefs = {
  active: boolean;
  onComplete: () => void;
  done: boolean;
  // The round JUST completed (1..6). Drives the round-transition text
  // overlay ("Round 1 — Round 2"). Null when the FX is inactive.
  fromRound: 1 | 2 | 3 | 4 | 5 | 6 | null;
};

function buildScene(app: Application, refs: FxRefs): () => void {
  const W = app.screen.width;
  const H = app.screen.height;

  // Background: a faint dark-blue overlay so the page's existing UI
  // recedes behind the celebration. Doesn't block clicks; the wrapping
  // <div> has pointer-events:none.
  const bg = new Graphics().rect(0, 0, W, H).fill({ color: 0x021029, alpha: 0.18 });
  app.stage.addChild(bg);

  // Layer textures — generated once.
  const snowTex = makeSoftCircleTexture(16, 250, 250, 240);
  const glowTex = makeSoftCircleTexture(40, 110, 220, 250);
  const goldTex = makeSoftCircleTexture(28, 230, 180, 80);

  // Snow container (no filter, normal alpha).
  const snowLayer = new Container();
  app.stage.addChild(snowLayer);

  // Glow container with bloom — additive blend so overlapping motes brighten,
  // BlurFilter for a soft halo. Strength 8 is enough on iPad without making
  // the GPU sweat; quality 2 matches.
  const glowLayer = new Container();
  glowLayer.blendMode = "add";
  const bloom = new BlurFilter({ strength: 8, quality: 2, resolution: 1 });
  glowLayer.filters = [bloom];
  app.stage.addChild(glowLayer);

  // Gold container — shares the additive look but separate so we can tune
  // independently if needed.
  const goldLayer = new Container();
  goldLayer.blendMode = "add";
  goldLayer.filters = [new BlurFilter({ strength: 4, quality: 2, resolution: 1 })];
  app.stage.addChild(goldLayer);

  // Caustic stage filter — adds the underwater dancing-light tint over
  // the whole frame. uTime advances each tick. uIntensity ramps with the
  // celebration phase so it eases in and out instead of cold-starting.
  const causticUniforms = new UniformGroup({
    uTime: { value: 0, type: "f32" as const },
    uIntensity: { value: 0, type: "f32" as const },
  });
  const causticFilter = new Filter({
    glProgram: GlProgram.from({ vertex: CAUSTIC_VERTEX, fragment: CAUSTIC_FRAGMENT }),
    resources: { causticUniforms },
  });
  app.stage.filters = [causticFilter];

  // Vignette — soft dark gradient on the edges. Drawn as a Graphics with
  // a radial fill emulated by overlapping ellipses; cheap and only mounts
  // for 8 seconds.
  const vignette = new Graphics().rect(0, 0, W, H).fill({
    color: 0x000000,
    alpha: 0,
  });
  // We use a simple radial fade by rendering a circle gradient via a 2D
  // canvas → Texture → Sprite at scene edges. Cheaper than per-frame paths.
  const vignetteCanvas = document.createElement("canvas");
  vignetteCanvas.width = W;
  vignetteCanvas.height = H;
  const vctx = vignetteCanvas.getContext("2d");
  if (vctx) {
    const r = Math.max(W, H) * 0.7;
    const grad = vctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r);
    grad.addColorStop(0, "rgba(0, 0, 0, 0)");
    grad.addColorStop(0.7, "rgba(0, 0, 0, 0)");
    grad.addColorStop(1, "rgba(0, 0, 20, 0.55)");
    vctx.fillStyle = grad;
    vctx.fillRect(0, 0, W, H);
    const vTex = Texture.from(vignetteCanvas);
    const vSprite = new Sprite(vTex);
    app.stage.addChild(vSprite);
  }
  app.stage.addChild(vignette);

  const particles: Particle[] = [];

  function spawnSnow(): void {
    const sprite = new Sprite(snowTex);
    sprite.anchor.set(0.5);
    sprite.x = Math.random() * W;
    sprite.y = -Math.random() * 30 - 10;
    const s = 0.25 + Math.random() * 0.5;
    sprite.scale.set(s);
    sprite.alpha = 0;
    snowLayer.addChild(sprite);
    particles.push({
      sprite,
      vy: 0.4 + Math.random() * 0.5,
      vx: (Math.random() - 0.5) * 0.15,
      swayBase: Math.random() * 1000,
      swaySpeed: 0.0015 + Math.random() * 0.001,
      age: 0,
      fadeIn: 400 + Math.random() * 400,
      baseAlpha: 0.4 + Math.random() * 0.35,
      layer: "snow",
    });
  }

  function spawnGlow(): void {
    const sprite = new Sprite(glowTex);
    sprite.anchor.set(0.5);
    sprite.x = Math.random() * W;
    sprite.y = -Math.random() * 30 - 10;
    const s = 0.4 + Math.random() * 0.7;
    sprite.scale.set(s);
    sprite.alpha = 0;
    glowLayer.addChild(sprite);
    particles.push({
      sprite,
      vy: 0.25 + Math.random() * 0.4,
      vx: (Math.random() - 0.5) * 0.1,
      swayBase: Math.random() * 1000,
      swaySpeed: 0.001 + Math.random() * 0.0008,
      age: 0,
      fadeIn: 600 + Math.random() * 400,
      baseAlpha: 0.6 + Math.random() * 0.35,
      layer: "glow",
    });
  }

  function spawnGold(): void {
    const sprite = new Sprite(goldTex);
    sprite.anchor.set(0.5);
    sprite.x = Math.random() * W;
    sprite.y = -Math.random() * 30 - 10;
    const s = 0.35 + Math.random() * 0.45;
    sprite.scale.set(s);
    sprite.alpha = 0;
    goldLayer.addChild(sprite);
    particles.push({
      sprite,
      vy: 0.2 + Math.random() * 0.25,
      vx: (Math.random() - 0.5) * 0.08,
      swayBase: Math.random() * 1000,
      swaySpeed: 0.0008 + Math.random() * 0.0006,
      age: 0,
      fadeIn: 700 + Math.random() * 400,
      baseAlpha: 0.55 + Math.random() * 0.3,
      layer: "gold",
    });
  }

  let elapsed = 0;
  const tick = (deltaMS: number): void => {
    elapsed += deltaMS;

    // Spawn rate factor — eased ramp-up, plateau, ramp-down. Ramp shape is
    // a smoothstep on each end so the particles ease in/out rather than
    // step-changing.
    const spawnFactor = (() => {
      if (elapsed < RAMP_UP_MS) {
        const t = elapsed / RAMP_UP_MS;
        return t * t * (3 - 2 * t);
      }
      if (elapsed < RAMP_DOWN_START_MS) return 1;
      if (elapsed < DURATION_MS) {
        const t = (DURATION_MS - elapsed) / (DURATION_MS - RAMP_DOWN_START_MS);
        return t * t * (3 - 2 * t);
      }
      return 0;
    })();

    // Caustic intensity rides the same envelope.
    causticUniforms.uniforms.uTime = elapsed / 1000;
    causticUniforms.uniforms.uIntensity = spawnFactor;

    // Spawn — Math.random() gates per-tick counts so we don't burst on
    // first frame.
    if (spawnFactor > 0) {
      for (let i = 0; i < SNOW_PER_TICK; i++) {
        if (Math.random() < spawnFactor) spawnSnow();
      }
      for (let i = 0; i < GLOW_PER_TICK; i++) {
        if (Math.random() < spawnFactor) spawnGlow();
      }
      if (Math.random() < GOLD_SPAWN_PROBABILITY * spawnFactor) spawnGold();
    }

    // Update particles. Reverse-iterate so splice is safe.
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (!p) continue;
      // Cache the sprite once per iteration. Per-frame loop over all
      // particles; each `p.sprite` access is a property chain on a Pixi
      // Container, repeated 8+ times below.
      const sprite = p.sprite;
      p.age += deltaMS;
      const dt = deltaMS / 16; // normalize to ~60fps step
      sprite.x += p.vx * dt + Math.sin((p.age + p.swayBase) * p.swaySpeed) * 0.4 * dt;
      sprite.y += p.vy * dt;

      // Alpha envelope: fade-in over `fadeIn`, hold at baseAlpha, then
      // fade-out as the particle approaches the bottom 15% of the screen.
      const fadeBoundary = H * 0.85;
      let alpha = p.baseAlpha;
      if (p.age < p.fadeIn) alpha *= p.age / p.fadeIn;
      if (sprite.y > fadeBoundary) {
        alpha *= Math.max(0, (H - sprite.y) / (H - fadeBoundary));
      }
      sprite.alpha = Math.max(0, alpha);

      // Cull off-screen.
      if (sprite.y > H + 20 || (p.age > 1500 && sprite.alpha <= 0.01)) {
        if (p.layer === "snow") snowLayer.removeChild(sprite);
        else if (p.layer === "glow") glowLayer.removeChild(sprite);
        else goldLayer.removeChild(sprite);
        sprite.destroy();
        particles.splice(i, 1);
      }
    }

    // onComplete fires at the end of the duration. The particle tail will
    // continue animating for ~2s but the route is free to advance.
    if (!refs.done && elapsed >= DURATION_MS) {
      refs.done = true;
      refs.onComplete();
    }
  };

  // ─── Round transition text ───────────────────────────────────────────
  // Two big stacked lines: "ROUND N" (the round just completed) over
  // "ROUND N+1" (the round about to start). Lives ABOVE the particle
  // layers but BELOW the caustic stage filter, so the typography is
  // washed by the same dancing-light tint as everything else.
  //
  // Style: the app's display family (Satoshi) at 11vw, white with a
  // soft cyan inner glow via dropShadow. Letter-spacing wide for a
  // ceremonial feel. Lifecycle: fade in 0.4–1.6s, hold to 6.8s,
  // fade out alongside the particle ramp-down.
  let roundTextContainer: Container | null = null;
  if (refs.fromRound !== null) {
    const fromN = refs.fromRound;
    // 6 is the campaign cap. Anything below shows "ROUND N+1" as the
    // teaser; the final boundary becomes "TRENCH CLEARED."
    const toN = fromN < 6 ? fromN + 1 : null;

    roundTextContainer = new Container();
    roundTextContainer.alpha = 0;
    roundTextContainer.x = W / 2;
    roundTextContainer.y = H / 2;
    app.stage.addChild(roundTextContainer);

    const titleStyle = new TextStyle({
      fontFamily: ["Satoshi", "ui-sans-serif", "system-ui", "sans-serif"],
      fontWeight: "900",
      fontSize: Math.min(W * 0.085, 140),
      fill: "#f5f3ed",
      letterSpacing: 8,
      align: "center",
      dropShadow: {
        color: "#67e8f9",
        alpha: 0.55,
        blur: 12,
        distance: 0,
      },
    });
    const subtitleStyle = new TextStyle({
      fontFamily: ["Satoshi", "ui-sans-serif", "system-ui", "sans-serif"],
      fontWeight: "300",
      fontSize: Math.min(W * 0.025, 36),
      fill: "#bae6fd",
      letterSpacing: 14,
      align: "center",
    });

    const completeLine = new Text({
      text: toN === null ? "TRENCH CLEARED" : `ROUND ${fromN} COMPLETE`,
      style: titleStyle,
    });
    completeLine.anchor.set(0.5);
    completeLine.y = -60;
    roundTextContainer.addChild(completeLine);

    const arrow = new Text({
      text: toN === null ? "" : "▾",
      style: new TextStyle({
        fontFamily: ["Satoshi", "ui-sans-serif", "system-ui", "sans-serif"],
        fontWeight: "300",
        fontSize: Math.min(W * 0.04, 56),
        fill: "#7dd3fc",
      }),
    });
    arrow.anchor.set(0.5);
    arrow.y = 30;
    if (toN !== null) roundTextContainer.addChild(arrow);

    const nextLine = new Text({
      text: toN === null ? "" : `ROUND ${toN}`,
      style: subtitleStyle,
    });
    nextLine.anchor.set(0.5);
    nextLine.y = 90;
    if (toN !== null) roundTextContainer.addChild(nextLine);
  }

  const textContainerRef = roundTextContainer;

  app.ticker.add((ticker) => {
    tick(ticker.deltaMS);

    // Round-text envelope: fade in 0.4–1.6s, hold, fade out 6.4–7.6s,
    // and a gentle scale-up for the whole 8s so the title "settles in."
    if (textContainerRef !== null) {
      const t = elapsed;
      // alpha defaults to 0 (the t<400 and t>=7600 windows); only the
      // three middle windows assign a non-zero value.
      let alpha = 0;
      if (t >= 400 && t < 1600) alpha = (t - 400) / 1200;
      else if (t < 6400) alpha = 1;
      else if (t < 7600) alpha = 1 - (t - 6400) / 1200;
      textContainerRef.alpha = Math.max(0, Math.min(1, alpha));
      const scaleProgress = Math.min(1, t / 2000);
      const scale = 0.92 + 0.08 * scaleProgress;
      textContainerRef.scale.set(scale);
    }
  });

  return () => {
    // Cleanup is handled by app.destroy() in usePixiApp; nothing extra
    // needed here. Particles, layers, and the filter are all on the
    // stage tree which destroy() walks recursively.
  };
}

// ─── Component ──────────────────────────────────────────────────────────
export function RoundCompleteFx({
  active,
  fromRound,
  onComplete,
}: {
  active: boolean;
  // The round JUST completed (1..6). Drives the round-transition text
  // overlay. Null when the FX is inactive.
  fromRound: 1 | 2 | 3 | 4 | 5 | 6 | null;
  onComplete: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Refs let the long-running setup callback see the latest props without
  // tearing down + recreating the whole Pixi app on each render.
  const refs = useRef<FxRefs>({
    active,
    onComplete,
    done: false,
    fromRound,
  });
  refs.current.active = active;
  refs.current.onComplete = onComplete;
  refs.current.fromRound = fromRound;

  usePixiApp(
    canvasRef,
    (app, { reducedMotion }) => {
      if (reducedMotion) {
        // Reduced motion: skip particles, fire completion next tick so the
        // route still advances. The kid sees no flourish but isn't stuck.
        const t = window.setTimeout(() => refs.current.onComplete(), 80);
        return () => window.clearTimeout(t);
      }
      refs.current.done = false;
      return buildScene(app, refs.current);
    },
    [active],
  );

  if (!active) return null;
  return (
    <div
      className="pointer-events-none fixed inset-0 z-40"
      data-test="round-complete-fx"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}
