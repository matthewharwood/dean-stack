// Encounter-count → poster variant.
//
// Each enemy ships three poster files in `public/enemies/`:
//   <id>.png       — the default poster (encounter 0, "you've never met")
//   <id>_L1.png    — first level-up (encounter 1, "you've defeated me once")
//   <id>_L2.png    — second level-up (encounter 2+, "I remember you")
//
// `encounters` is the count of times the kid has DEFEATED the enemy across
// the run, NOT the count of times they've seen it. The variant shown on the
// CURRENT encounter is therefore one step behind the count: count=0 → default
// (the very first time the enemy appears), count=1 → L1 (re-encounter after
// one defeat), count=2+ → L2 (capped — we ship two level-up variants).
//
// The cap is intentional: any count past 2 sticks on L2 forever. Future
// variants would extend the union AND the cap; today the registry only
// has _L1 and _L2 files, so going past 2 is a safe clamp.

export type PosterVariant = "default" | "L1" | "L2";

export const POSTER_VARIANTS: readonly PosterVariant[] = ["default", "L1", "L2"];

export function posterVariant(encounters: number): PosterVariant {
  if (!Number.isFinite(encounters) || encounters <= 0) return "default";
  if (encounters === 1) return "L1";
  return "L2";
}

// Pure path transform: swap the trailing `.png` with `_L1.png` / `_L2.png`.
// Default returns the input untouched. Works against the URLs in
// `enemies.ts` (which always end in `.png`); a non-png input is returned
// untouched so a future asset format swap isn't load-bearing on this
// helper.
export function derivePosterUrl(imageUrl: string, encounters: number): string {
  const variant = posterVariant(encounters);
  if (variant === "default") return imageUrl;
  if (!imageUrl.endsWith(".png")) return imageUrl;
  return `${imageUrl.slice(0, -".png".length)}_${variant}.png`;
}
