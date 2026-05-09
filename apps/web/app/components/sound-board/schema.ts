import * as z from "zod";

export const SoundBoardPropsSchema = z.object({
  // Optional filter — show only events whose ID starts with this prefix
  // (e.g. "combat-" or "ui-"). Undefined = show all.
  prefix: z.string().optional(),
});
