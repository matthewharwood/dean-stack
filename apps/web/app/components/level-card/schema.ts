import * as z from "zod";

export const LevelCardPropsSchema = z.object({
  level: z.int().min(1).max(99),
  completed: z.boolean(),
  // z.custom for the callback — Function values aren't structurally validatable
  // by Zod beyond `typeof === "function"`, but the brand carries the TS type.
  onComplete: z.custom<() => void>((v) => typeof v === "function"),
});
export type LevelCardProps = z.infer<typeof LevelCardPropsSchema>;
