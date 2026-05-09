import * as z from "zod";

export * from "./adding-game";

// Pillar 3 contract — every IDB-backed schema declares its zero via `.default()`
// on each defaultable field, and exports a named `<NAME>_DEFAULT` companion when
// the entire shape is defaultable. atomWithIDB consumers import the companion
// instead of inlining a literal — single source of truth for the zero.

export const ScoreSchema = z.object({
  player: z.string().min(1),
  value: z.int().min(0),
});
export type Score = z.infer<typeof ScoreSchema>;

export const SettingsSchema = z.object({
  id: z.literal("settings").default("settings"),
  theme: z.enum(["light", "dark"]).default("light"),
  reducedMotion: z.boolean().default(false),
});
export type Settings = z.infer<typeof SettingsSchema>;
export const SETTINGS_DEFAULT: Settings = SettingsSchema.parse({});

// `id` is caller-supplied (per-level), so there is no fully-defaulted PROGRESS_DEFAULT.
// Callers construct via `ProgressSchema.parse({ id })` — same parse path, same source of truth.
export const ProgressSchema = z.object({
  id: z.string().min(1),
  level: z.int().min(1).default(1),
  completed: z.boolean().default(false),
});
export type Progress = z.infer<typeof ProgressSchema>;

// Sound playback settings — global mute + master volume. Persists across reloads
// so a parent muting for naptime doesn't have to re-mute every page load.
export const SoundSettingsSchema = z.object({
  id: z.literal("sound-settings").default("sound-settings"),
  enabled: z.boolean().default(true),
  masterVolume: z.number().min(0).max(1).default(1),
});
export type SoundSettings = z.infer<typeof SoundSettingsSchema>;
export const SOUND_SETTINGS_DEFAULT: SoundSettings = SoundSettingsSchema.parse({});
