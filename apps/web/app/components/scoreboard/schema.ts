import { ScoreSchema } from "@dean-stack/schemas";
import * as z from "zod";

export const ScoreboardPropsSchema = z.object({
  scores: z.array(ScoreSchema),
  highlightTop: z.boolean().default(false),
});
