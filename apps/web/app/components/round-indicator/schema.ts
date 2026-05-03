import * as z from "zod";

export const RoundIndicatorPropsSchema = z.object({
  // 1, 2, 3, 4. Four-round campaign: addition / subtraction / inequality
  // / mixed. Constrained as a literal union so a future round-5 expansion
  // is a deliberate schema bump.
  round: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  // Global 1-based level index within the run (1..23).
  levelIndex: z.int().min(1),
  // 1-based local index within the current round (1..6 or 1..5).
  localLevel: z.int().min(1),
  // Total levels in the current round — drives the progress dot count.
  tierLevelCount: z.int().min(1),
});
export type RoundIndicatorProps = z.infer<typeof RoundIndicatorPropsSchema>;
