import * as z from "zod";

export const RoundIndicatorPropsSchema = z.object({
  // 1..16. Sixteen-round campaign. R1–R15 as before; R16 is the
  // Times Table Tower — 11 chant rows + 1 rooftop capstone with a
  // new shared Tower Keeper boss across all 12 levels. Constrained
  // as a literal union so a future round-17 expansion is a
  // deliberate schema bump (see ADD-A-ROUND CHECKLIST in jump.ts).
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
    z.literal(10),
    z.literal(11),
    z.literal(12),
    z.literal(13),
    z.literal(14),
    z.literal(15),
    z.literal(16),
  ]),
  // Global 1-based level index within the run (1..90).
  levelIndex: z.int().min(1),
  // 1-based local index within the current round (1..5 or 1..6).
  localLevel: z.int().min(1),
  // Total levels in the current round — drives the progress dot count.
  tierLevelCount: z.int().min(1),
  // Total levels across the whole campaign — drives the segmented
  // progress strip (one vertical bar per level). The route passes
  // `FINAL_LEVEL_INDEX` so a future round expansion grows the bar
  // count without touching the indicator.
  totalLevels: z.int().min(1),
});
