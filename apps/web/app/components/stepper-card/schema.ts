import * as z from "zod";

export const StepperCardPropsSchema = z.object({
  // Current value displayed in the centered circle.
  value: z.int(),
  // Tap handler for the top half of the card (+1). Fires once per tap.
  onIncrement: z.custom<() => void>((v) => typeof v === "function"),
  // Tap handler for the bottom half of the card (−1). Fires once per
  // tap. The handler is expected to clamp at 0 on its own; the card
  // itself doesn't disable the − half so the kid always gets visual
  // feedback for the tap.
  onDecrement: z.custom<() => void>((v) => typeof v === "function"),
  // Disable both halves (no tap firing) when the round is in a
  // post-evaluate state and the kid is between rounds. Optional —
  // default false so most stories don't have to plumb it.
  disabled: z.boolean().optional(),
});
