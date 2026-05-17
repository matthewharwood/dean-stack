import * as z from "zod";

export const SwipeToEvaluatePropsSchema = z.object({
  // Fires once the kid completes a right→left swipe past the commit
  // threshold. The component handles its own debounce — the parent
  // sees exactly one call per successful swipe.
  onCommit: z.custom<() => void>((v) => typeof v === "function"),
  // Fires when the kid grabs the knob WITHOUT the equation being
  // ready (canCommit false). Lets the parent surface the "fill out
  // the board first" prompt that the old Evaluate button showed on
  // a disabled tap. Optional — disabled grabs are silent if omitted.
  onDisabledAttempt: z.custom<() => void>((v) => typeof v === "function").optional(),
  // When false, the track muted out and onCommit never fires even if
  // the kid does swipe fully. `onDisabledAttempt` (above) lets the
  // parent still react to the grab so the kid gets feedback.
  canCommit: z.boolean(),
  // Label shown on the track when the swipe is at rest. Defaults to
  // "Swipe to attack" — the right copy for evaluate-on-attack rounds.
  label: z.string().optional(),
});
