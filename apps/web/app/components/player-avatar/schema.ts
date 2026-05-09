import { PlayerProgressSchema, PlayerTemplateSchema } from "@dean-stack/schemas";
import * as z from "zod";

export const PlayerAvatarPropsSchema = z.object({
  // The static template (name, role, rarity, image, bio). Null renders
  // the empty-frame state so the RightCol always shows a frame even
  // when the roster is loading or unset.
  player: PlayerTemplateSchema.nullable(),
  // 1-based position of the current player within the cycling list.
  // Renders as the digit on the cycle button. Null hides the cycle
  // button entirely (no roster context).
  profileIndex: z.int().min(1).nullable(),
  profileCount: z.int().min(1).nullable(),
  // Cycle handler — switches to the next pilot in the registry. Null
  // hides the cycle button (used by stories that show a single
  // profile without rotation).
  onCycle: z.custom<() => void>((v) => typeof v === "function").nullable(),
  // The selected pilot's persisted xp + level. Null when no pilot is
  // selected (matches `player == null`).
  progress: PlayerProgressSchema.nullable(),
  // XP required for the current level → next level. Owned by the route
  // (computed via xp.ts) so the avatar stays a dumb display surface and
  // the curve has one source of truth. Null when there's no pilot.
  xpThreshold: z.int().min(1).nullable(),
});
