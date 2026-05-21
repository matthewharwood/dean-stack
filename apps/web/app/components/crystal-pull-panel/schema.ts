import { CrystalIdSchema } from "@dean-stack/schemas";
import * as z from "zod";

// Three-option crystal pull panel. The parent (the adding-game route, or a
// Storybook host) supplies exactly three CrystalIds; the panel owns the
// reveal cinematography + SFX and fires `onSelect(id)` once the kid has
// picked and the reveal animation has settled.
//
// Pillar 2: shape comes from CrystalIdSchema in the schemas package, so a
// new crystal id is always validated end-to-end at the boundary.

export const CrystalPullPanelPropsSchema = z.object({
  // Exact tuple of three crystal ids. We don't enforce uniqueness here
  // because buildPullOptions (apps/web/app/games/adding-game/crystals.ts)
  // is the single producer and its tests cover the no-duplicates contract.
  options: z.tuple([CrystalIdSchema, CrystalIdSchema, CrystalIdSchema]),
  // Fires once the kid has picked AND the reveal cinematic has settled
  // (face-up, info displayed, hold expired). The parent then writes the
  // crystal into IDB and clears pendingPull.
  onSelect: z.custom<(id: z.infer<typeof CrystalIdSchema>) => void>((v) => typeof v === "function"),
});
