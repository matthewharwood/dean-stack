import { CrystalIdSchema } from "@dean-stack/schemas";
import * as z from "zod";

// Read-only display of the kid's owned crystals. Rendered in the Top
// panel alongside the RoundIndicator + MistakesBadge. Tapping a crystal
// pill surfaces its name + description in a small tooltip; the bar
// itself never mutates state.
export const CollectionBarPropsSchema = z.object({
  ownedCrystals: z.array(CrystalIdSchema),
});
