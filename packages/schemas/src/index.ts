import * as z from "zod";

export const ScoreSchema = z.object({
  player: z.string().min(1),
  value: z.int().min(0),
});
export type Score = z.infer<typeof ScoreSchema>;

export const SettingsSchema = z.object({
  id: z.literal("settings"),
  theme: z.enum(["light", "dark"]),
  reducedMotion: z.boolean(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const ProgressSchema = z.object({
  id: z.string().min(1),
  level: z.int().min(1),
  completed: z.boolean(),
});
export type Progress = z.infer<typeof ProgressSchema>;
