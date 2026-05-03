import { Geometry, GlProgram, Mesh, Shader, UniformGroup } from "pixi.js";

import { ATTACK_DURATION_MS, type AttackCtx } from "./types";

// Beam — a custom-shaded glowing line from attacker to target. The
// fragment shader generates an animated energy noise along the beam
// (sin/cos product) so the line shimmers rather than reading as a flat
// stroke. Kind that most leverages the pixijs custom-rendering surface.
//
// Geometry: a 2-triangle quad sized to the beam length × thickness, then
// rotated to align attacker → target.
const BEAM_VERTEX = /* glsl */ `
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;

void main(void) {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
}
`;

const BEAM_FRAGMENT = /* glsl */ `
in vec2 vUV;
out vec4 finalColor;

uniform float uTime;
uniform float uIntensity;
uniform vec3 uColor;

void main(void) {
  // Distance from beam centerline (y around 0.5).
  float d = abs(vUV.y - 0.5) * 2.0;
  // Core: bright at center, fades at edges.
  float core = smoothstep(1.0, 0.0, d);
  // Energy noise — interfering sin waves traveling along the beam.
  float n = sin(vUV.x * 28.0 - uTime * 18.0) * 0.5 + 0.5;
  float n2 = sin(vUV.x * 53.0 + uTime * 12.0 + 1.7) * 0.5 + 0.5;
  float shimmer = mix(0.7, 1.2, (n * n2));
  // Soft fade-out at the very ends so the beam doesn't terminate flat.
  float endFade = smoothstep(0.0, 0.05, vUV.x) * smoothstep(1.0, 0.95, vUV.x);
  float a = core * shimmer * endFade * uIntensity;
  finalColor = vec4(uColor * a, a);
}
`;

function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = Number.parseInt(h, 16);
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

export function runBeam(ctx: AttackCtx): Promise<void> {
  const { app, from, to, color } = ctx;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const thickness = 36;

  // Geometry: a unit-square quad. The mesh's transform handles
  // rotation/scale to span attacker → target.
  const geometry = new Geometry({
    attributes: {
      aPosition: [0, -0.5, 1, -0.5, 1, 0.5, 0, 0.5],
      aUV: [0, 0, 1, 0, 1, 1, 0, 1],
    },
    indexBuffer: [0, 1, 2, 0, 2, 3],
  });

  const [r, g, b] = hexToRgb01(color);

  const beamUniforms = new UniformGroup({
    uTime: { value: 0, type: "f32" as const },
    uIntensity: { value: 0, type: "f32" as const },
    uColor: { value: [r, g, b] as [number, number, number], type: "vec3<f32>" as const },
  });

  const shader = new Shader({
    glProgram: GlProgram.from({ vertex: BEAM_VERTEX, fragment: BEAM_FRAGMENT }),
    resources: { beamUniforms },
  });

  const mesh = new Mesh({ geometry, shader });
  mesh.x = from.x;
  mesh.y = from.y;
  mesh.rotation = Math.atan2(dy, dx);
  mesh.scale.set(length, thickness);
  mesh.blendMode = "add";
  app.stage.addChild(mesh);

  return new Promise<void>((resolve) => {
    let elapsed = 0;
    const tick = (deltaMS: number): void => {
      elapsed += deltaMS;
      const t = Math.min(1, elapsed / ATTACK_DURATION_MS);
      // Intensity envelope: punch in 0–80ms, hold to 380ms, fade by 500ms.
      let intensity = 0;
      if (elapsed < 80) intensity = elapsed / 80;
      else if (elapsed < 380) intensity = 1;
      else intensity = Math.max(0, 1 - (elapsed - 380) / 120);
      beamUniforms.uniforms.uTime = elapsed / 1000;
      beamUniforms.uniforms.uIntensity = intensity;
      if (t >= 1) {
        app.ticker.remove(tick);
        mesh.destroy({ texture: false });
        resolve();
      }
    };
    app.ticker.add((ticker) => tick(ticker.deltaMS));
  });
}
