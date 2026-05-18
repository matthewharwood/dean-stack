import { Filter, GlProgram, Sprite, Texture, type Ticker } from "pixi.js";
import { useRef } from "react";

import { usePixiApp } from "~/canvas/use-pixi-app";
import { defineComponent } from "~/lib/define-component";

import { WaterCanvasPropsSchema } from "./schema";

// Pixi v8 default filter vertex shader. We don't customize the vertex
// stage — we just need a fullscreen pass that hands UVs to the fragment
// shader. The uniforms (uInputSize / uOutputFrame / uOutputTexture) are
// auto-supplied by Pixi's filter pipeline; we MUST declare them so the
// shader compiles.
const VERTEX = `in vec2 aPosition;
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
}`;

// Procedural water — deep oceanic palette with diagonal flow
// (top-left → bottom-right via the `(uv.x + uv.y)` phase). Four wave
// layers + a slow-traveling sheen + a soft vignette so the title-
// screen kid actually reads "ocean", not "subtle off-white".
//
// `uTime` is in milliseconds — we scale it down to a slow drift inside
// the shader (the 0.00025 multiplier ⇒ a wave cycle every ~25s at the
// slowest layer). `uViewport` lets us normalize UVs so the wavelengths
// stay consistent regardless of canvas size.
//
// Performance: ~20 ops/pixel including sin × 5. At 1080p × 60fps that
// is ~125 MOps/s on the GPU — trivial. The shader is single-pass and
// allocates nothing per-frame.
const FRAGMENT = `in vec2 vTextureCoord;
out vec4 finalColor;

uniform float uTime;
uniform vec2 uViewport;

void main(void) {
  // Normalize against the longer edge so wave wavelengths are
  // viewport-invariant. (Without this, a wider canvas would stretch
  // the waves horizontally.)
  vec2 uv = vTextureCoord * uViewport / max(uViewport.x, uViewport.y);
  float t = uTime * 0.00025;

  // Four sine layers — slow primary diagonal, fast cross-diagonal,
  // medium back-diagonal, and a slow drift. Phases all key off the
  // diagonal sum (uv.x + uv.y) so wave fronts travel top-left → bottom-right;
  // cross terms shimmer the surface so it doesn't read as a single
  // rolling sheet. The blend weights keep the slow primary dominant
  // so the eye reads BIG slow swells with finer detail on top.
  float w1 = sin((uv.x + uv.y) * 5.0  + t * 1.0) * 0.5 + 0.5;
  float w2 = sin((uv.x * 13.0 - uv.y * 9.0) + t * 1.9) * 0.5 + 0.5;
  float w3 = sin((uv.x * 7.0  + uv.y * 4.0) - t * 0.7) * 0.5 + 0.5;
  float w4 = sin((uv.x * 2.0  + uv.y * 2.5) + t * 0.4) * 0.5 + 0.5;
  float waves = w1 * 0.45 + w2 * 0.20 + w3 * 0.20 + w4 * 0.15;

  // Deep oceanic palette — saturated blue in the troughs, bright
  // sea-foam on the crests. Wider luminance gap than the old pale
  // grey so the motion actually reads on a white-ish page.
  vec3 deepCol  = vec3(0.32, 0.55, 0.74);
  vec3 lightCol = vec3(0.78, 0.92, 0.97);
  vec3 color = mix(deepCol, lightCol, waves);

  // Slow-traveling sheen band — a diagonal highlight that drifts
  // across the canvas like a sun glint on the water. Brighter than
  // before so it reads as a distinct event, not background noise.
  float sheen = smoothstep(0.46, 0.54, sin((uv.x + uv.y) * 1.5 + t * 0.35) * 0.5 + 0.5);
  color += vec3(sheen * 0.18);

  // Soft radial vignette so the corners darken into "deep ocean".
  // The kid's eye centers on the action; the deeps frame it.
  float d = length(vTextureCoord - 0.5);
  float vignette = smoothstep(0.95, 0.35, d);
  color *= mix(0.75, 1.0, vignette);

  finalColor = vec4(color, 1.0);
}`;

// Pixi-backed water background. Mounts a fullscreen Sprite covered by a
// custom Filter whose fragment shader renders procedural water. No
// drag, no interaction — `pointer-events: none` lives at the wrapper
// the route uses, so the canvas never blocks the game.
//
// Side-channel discipline: `usePixiApp` owns the Pixi lifecycle; we
// only add children + Ticker callbacks inside the setup. Pixi's scene
// mutates outside React, exactly as the dean-stack convention requires.
//
// Reduced motion: when `prefers-reduced-motion: reduce` is set, we
// still paint a single frame of the water shader (so the kid sees the
// palette behind the panels) but skip the Ticker callback — no
// animation, no battery cost.
export const WaterCanvas = defineComponent(WaterCanvasPropsSchema, () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  usePixiApp(
    canvasRef,
    (app, { reducedMotion }) => {
      // Fullscreen sprite seeded with the unit-white texture. The
      // filter ignores the underlying texture entirely (it never
      // calls texture() on uTexture), but the sprite gives Pixi a
      // surface to apply the filter to.
      const sprite = new Sprite(Texture.WHITE);
      sprite.width = app.screen.width;
      sprite.height = app.screen.height;
      app.stage.addChild(sprite);

      const viewport = new Float32Array([app.screen.width, app.screen.height]);
      const filter = new Filter({
        glProgram: new GlProgram({ vertex: VERTEX, fragment: FRAGMENT, name: "water" }),
        resources: {
          waterUniforms: {
            uTime: { value: 0, type: "f32" },
            uViewport: { value: viewport, type: "vec2<f32>" },
          },
        },
      });
      sprite.filters = [filter];

      // Keep the sprite + viewport uniform in sync with the renderer
      // size. Pixi's `resizeTo` handles the canvas backing-store; we
      // resize the sprite (so the filter has a quad of the right size)
      // and update the viewport uniform (so wave wavelengths stay
      // consistent across orientation changes).
      const onResize = (): void => {
        sprite.width = app.screen.width;
        sprite.height = app.screen.height;
        viewport[0] = app.screen.width;
        viewport[1] = app.screen.height;
      };
      app.renderer.on("resize", onResize);

      if (reducedMotion) {
        return (): void => {
          app.renderer.off("resize", onResize);
        };
      }

      let elapsed = 0;
      const tick = (ticker: Ticker): void => {
        elapsed += ticker.deltaMS;
        filter.resources.waterUniforms.uniforms.uTime = elapsed;
      };
      app.ticker.add(tick);

      return (): void => {
        app.ticker.remove(tick);
        app.renderer.off("resize", onResize);
      };
    },
    [],
  );

  return <canvas ref={canvasRef} data-test="water-canvas" className="block size-full" />;
});
