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

// Procedural water. Three sine layers at different frequencies and
// directions (the diagonal phase `(x + y)` and the cross-diagonals make
// the wave fronts intersect, so the eye reads complexity instead of a
// uniform grid). One slow-traveling sheen band layered on top.
//
// `uTime` is in milliseconds — we scale it down to a slow oceanic
// drift inside the shader (the 0.0003 multiplier ⇒ a wave cycle every
// ~20s at the slowest layer). `uViewport` lets us normalize UVs so the
// wavelengths stay consistent regardless of canvas size.
const FRAGMENT = `in vec2 vTextureCoord;
out vec4 finalColor;

uniform float uTime;
uniform vec2 uViewport;

void main(void) {
  // Normalize against the longer edge so wave wavelengths are
  // viewport-invariant. (Without this, a wider canvas would stretch
  // the waves horizontally.)
  vec2 uv = vTextureCoord * uViewport / max(uViewport.x, uViewport.y);
  float t = uTime * 0.0003;

  // Three sine layers — diagonal, cross-diagonal-fast, cross-diagonal-
  // slow. The blend (0.5 / 0.3 / 0.2) keeps the largest wave dominant
  // so the kid reads big slow swells with small ripples on top.
  float w1 = sin((uv.x + uv.y) * 8.0 + t * 1.0) * 0.5 + 0.5;
  float w2 = sin((uv.x * 11.0 - uv.y * 7.0) + t * 1.7) * 0.5 + 0.5;
  float w3 = sin((uv.x * 4.0 + uv.y * 3.0) - t * 0.5) * 0.5 + 0.5;
  float waves = w1 * 0.5 + w2 * 0.3 + w3 * 0.2;

  // Pale oceanic palette — slightly darker in the troughs, slightly
  // lighter on the crests. Subtle enough to live behind the panels
  // without competing with the gameplay surfaces.
  vec3 deepCol = vec3(0.74, 0.83, 0.89);
  vec3 lightCol = vec3(0.88, 0.94, 0.97);
  vec3 color = mix(deepCol, lightCol, waves);

  // Diagonal sheen — a thin band of light that drifts across the
  // canvas, so the kid catches a "sun glint" every ~30s. Smoothstep
  // gives the band soft edges; the small additive bump keeps the
  // overall brightness in range.
  float sheen = smoothstep(0.45, 0.55, sin((uv.x + uv.y) * 1.5 + t * 0.3) * 0.5 + 0.5);
  color += vec3(sheen * 0.06);

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
