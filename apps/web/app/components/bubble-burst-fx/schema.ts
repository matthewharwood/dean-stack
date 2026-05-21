import * as z from "zod";

// Bubble Burst Tide-Sigil effect. The route increments `trigger` each time
// the kid wins an evaluation; the component re-mounts via the React key
// pattern (key={trigger}) so the CSS keyframe restarts cleanly. `enabled`
// gates the whole render so the route doesn't have to conditionally mount.
export const BubbleBurstFxPropsSchema = z.object({
  enabled: z.boolean(),
  trigger: z.int().min(0),
});
