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
});
export type EnemyAvatarProps = z.infer<typeof EnemyAvatarPropsSchema>;
