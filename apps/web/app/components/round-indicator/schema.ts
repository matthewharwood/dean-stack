import * as z from "zod";

export const RoundIndicatorPropsSchema = z.object({
  // 1..6. Six-round campaign: add / subtract / inequality / mixed-tier-2 /
  // find-missing-result-add / find-missing-result-subtract. Constrained as
  // a literal union so a future round-7 expansion is a deliberate schema
  // bump (see ADD-A-ROUND CHECKLIST in jump.ts).
  round: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  // Global 1-based level index within the run (1..33).
  levelIndex: z.int().min(1),
  // 1-based local index within the current round (1..5 or 1..6).
  localLevel: z.int().min(1),
  // Total levels in the current round — drives the progress dot count.
  tierLevelCount: z.int().min(1),
});
