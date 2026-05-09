import { EnemyTemplateSchema } from "@dean-stack/schemas";
import * as z from "zod";

export const EnemyAvatarPropsSchema = z.object({
  // The static template (name, type, rarity, image, baseline maxHp) —
  // null renders the empty state so the LeftCol always shows a frame.
  enemy: EnemyTemplateSchema.nullable(),
  // Live HP for THIS round. Null when there's no enemy active.
  hp: z.int().min(0).nullable(),
  // Effective max HP for THIS round (from the level config, not the
  // template). The same enemy returns across rounds with different
  // ceilings, so the bar's denominator must be per-round. Null falls
  // back to the template's maxHp.
  maxHp: z.int().min(1).nullable().optional(),
  // Times the kid has previously DEFEATED this enemy across the run.
  // Drives the poster variant via `derivePosterUrl`: 0 → default, 1 → L1,
  // 2+ → L2 (capped). The component stays pure — the route reads from the
  // `enemyEncounters` map on the addingGame atom and passes the count in.
  // Optional so callers (and stories) that don't care about progression
  // can omit it; the component falls back to 0 (default poster).
  encounters: z.int().min(0).optional(),
});
