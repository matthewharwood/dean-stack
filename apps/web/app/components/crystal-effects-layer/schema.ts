import { CrystalIdSchema } from "@dean-stack/schemas";
import * as z from "zod";

// Page-level effects overlay. Mounted by the adding-game route as a
// sibling of the game board (NOT a child — the layer is absolutely
// positioned and pointer-events-none, so it can't intercept drag input).
// The route reads the kid's owned crystals from state.crystals and passes
// the array down; the layer renders only the effects that are owned.
export const CrystalEffectsLayerPropsSchema = z.object({
  ownedCrystals: z.array(CrystalIdSchema),
});
