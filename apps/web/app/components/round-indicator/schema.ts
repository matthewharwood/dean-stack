import * as z from "zod";

export const RoundIndicatorPropsSchema = z.object({
  // 1..9. Nine-round campaign: add / subtract / inequality / mixed-tier-2 /
  // find-missing-result-add / find-missing-result-subtract / find-missing-
  // result-add-to-20 / find-missing-result-subtract-from-20 / true-false-
  // multiply-intro. Constrained as a literal union so a future round-10
  // expansion is a deliberate schema bump (see ADD-A-ROUND CHECKLIST in
  // jump.ts).
  round: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
    z.literal(8),
    z.literal(9),
  ]),
  // Global 1-based level index within the run (1..48).
  levelIndex: z.int().min(1),
  // 1-based local index within the current round (1..5 or 1..6).
  localLevel: z.int().min(1),
  // Total levels in the current round — drives the progress dot count.
  tierLevelCount: z.int().min(1),
});
