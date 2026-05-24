import type { CrystalId } from "@dean-stack/schemas";
import { type ReactNode, Suspense } from "react";

import { CrystalEffectsLayer } from "~/components/crystal-effects-layer";

// `transparent` (optional) drops the panel-glass background + shadow on
// LeftCol / Top / Bottom / RightCol — used by the splash screen so the
// 4 surrounding panels disappear and the title sits over the bare
// water canvas. The Center panel is excluded by design (the splash
// content lives there and still benefits from the glass surface).
export type RegionProps = { children?: ReactNode; transparent?: boolean };

// Module-level so the GameBoard default-prop value is a stable reference
// across renders. A `prop = []` literal would create a fresh array each
// call, breaking identity-based memoization in any downstream consumer
// (react-doctor catches this exact shape).
const NO_OWNED_CRYSTALS: readonly CrystalId[] = [];

// The WaterCanvas component is lazy-loaded by the caller and threaded in
// via the `waterCanvas` prop so this file doesn't have to import the
// dynamic-loaded module itself. Same goes for the FX-enabled flag.
export function GameBoard({
  children,
  ownedCrystals = NO_OWNED_CRYSTALS,
  waterCanvas,
}: RegionProps & {
  ownedCrystals?: readonly CrystalId[];
  // The lazy-loaded Pixi water canvas, mounted into the z-0 background
  // layer. Pass `null` to skip Pixi entirely (SSR + opt-out path).
  waterCanvas?: ReactNode;
}): ReactNode {
  // `select-none` + iOS callout suppression: a long-press on a number / "+"
  // glyph would otherwise trigger Safari's text-selection magnifier or copy
  // menu and eat the pointer events the drag system is listening for.
  //
  // Layering:
  //   - `water-bg` class on the <main> is the static CSS fallback (kicks
  //     in when WebGL is unavailable — headless tests, ancient devices —
  //     so the kid still sees an oceanic palette).
  //   - `<WaterCanvas />` mounts a Pixi shader on top of that fallback;
  //     when it's running, the shader paints over the CSS gradient.
  //   - `<CrystalEffectsLayer />` renders Tide-Sigil cosmetics (marine
  //     snow drift, caustic light pulse) in the SAME z-0 layer as the
  //     water. The kid sees them floating in the ocean, beneath the UI.
  //   - Grid children sit above the canvas via `relative z-10`. The
  //     panel surfaces use `panel-glass` so the water shows through the
  //     gaps AND subtly through the panels themselves (cards stay
  //     opaque on top).
  // Crystal-driven className list. Each owned crystal contributes a
  // `charm-<id>` class that CSS descendant selectors target — zero
  // prop-threading, any descendant can opt into a charm rule via the
  // selectors defined under "Card Charm crystal effects" in styles/index.css.
  const charmClasses = ownedCrystals.map((c) => `charm-${c}`).join(" ");
  return (
    <main
      className={`water-bg relative h-dvh font-openrunde select-none [-webkit-touch-callout:none] [-webkit-user-select:none] ${charmClasses}`}
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        {waterCanvas ? <Suspense fallback={null}>{waterCanvas}</Suspense> : null}
        <CrystalEffectsLayer ownedCrystals={[...ownedCrystals]} />
      </div>
      <div className="relative z-10 grid h-full grid-cols-[1fr_2fr_1fr] gap-[18px] p-[18px]">
        {children}
      </div>
    </main>
  );
}
