import { defineComponent } from "~/lib/define-component";

import { CrystalEffectsLayerPropsSchema } from "./schema";

// Stable particle field for Marine Snow. Module-level constant so the
// particles look the same across mounts (Math.random inside render would
// re-roll every re-render and the React Compiler can't memoize impure
// calls — useState/useRef would work too but a module constant has zero
// runtime cost).
//
// 40 particles is enough to read as "drifting field" without taxing the
// compositor; each one is a tiny absolutely-positioned div animating
// translateY + opacity via the @keyframes in styles/index.css.
const SNOW_PARTICLE_COUNT = 40;
interface SnowParticle {
  id: string;
  leftPct: number;
  delaySec: number;
  durationSec: number;
  sizePx: number;
  opacity: number;
}
const SNOW_PARTICLES: readonly SnowParticle[] = Array.from(
  { length: SNOW_PARTICLE_COUNT },
  (_, i) => ({
    id: `snow-${i}`,
    leftPct: Math.random() * 100,
    delaySec: Math.random() * 20,
    durationSec: 14 + Math.random() * 16,
    sizePx: 2 + Math.random() * 3,
    opacity: 0.25 + Math.random() * 0.45,
  }),
);

// Page-level cosmetic overlay for Echo Crystal effects that affect the
// whole scene (Tide Sigils). Card-level effects (Card Charms) live
// directly on the DraggableCard / Card components instead — see the
// crystal-charms section of styles/index.css.
//
// Pointer-events-none across the whole layer so it never blocks drag
// input or button taps. The layer self-positions absolutely inside its
// parent (the route wraps it in a relatively-positioned container).
export const CrystalEffectsLayer = defineComponent(
  CrystalEffectsLayerPropsSchema,
  ({ ownedCrystals }) => {
    const owned = new Set(ownedCrystals);
    const showSnow = owned.has("marine-snow");
    const showCaustic = owned.has("caustic-light");

    if (!showSnow && !showCaustic) return null;

    return (
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        data-test="crystal-effects-layer"
        aria-hidden
      >
        {showCaustic && (
          <div
            className="absolute inset-0 animate-crystal-caustic-pulse mix-blend-screen"
            data-test="crystal-effect-caustic-light"
            style={{
              background:
                "radial-gradient(ellipse 60% 80% at 30% 20%, rgb(255 250 220 / 22%), transparent 70%), radial-gradient(ellipse 50% 70% at 75% 65%, rgb(200 235 255 / 18%), transparent 70%)",
            }}
          />
        )}
        {showSnow && (
          <div className="absolute inset-0" data-test="crystal-effect-marine-snow">
            {SNOW_PARTICLES.map((p) => (
              <span
                key={p.id}
                className="absolute top-[-8px] block rounded-full bg-white animate-crystal-marine-snow"
                style={{
                  left: `${p.leftPct}%`,
                  width: `${p.sizePx}px`,
                  height: `${p.sizePx}px`,
                  opacity: p.opacity,
                  animationDelay: `${p.delaySec}s`,
                  animationDuration: `${p.durationSec}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);
