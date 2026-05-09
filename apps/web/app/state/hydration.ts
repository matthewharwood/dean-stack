import {
  ADDING_GAME_DEFAULT,
  type AddingGameState,
  AddingGameStateSchema,
  type Progress,
  ProgressSchema,
  SETTINGS_DEFAULT,
  type Settings,
  SettingsSchema,
  SOUND_SETTINGS_DEFAULT,
  type SoundSettings,
  SoundSettingsSchema,
} from "@dean-stack/schemas";

import { getDB } from "./db";

export type HydratedState = {
  progress: ReadonlyMap<string, Progress>;
  settings: Settings;
  addingGame: AddingGameState;
  soundSettings: SoundSettings;
};

export type StoreName = keyof HydratedState;

let resolvedSnapshot: HydratedState | null = null;

export function getHydratedSnapshot(): HydratedState | null {
  return resolvedSnapshot;
}

// Started at module-evaluation time. The root <Suspense> boundary calls
// `use(idbHydrationPromise)` once; until it resolves, no atom is read.
// In a prerender / SSR-shell context (no indexedDB), resolves with empty state.
export const idbHydrationPromise: Promise<HydratedState> = (async () => {
  if (typeof indexedDB === "undefined") {
    const empty: HydratedState = {
      progress: new Map(),
      settings: SETTINGS_DEFAULT,
      addingGame: ADDING_GAME_DEFAULT,
      soundSettings: SOUND_SETTINGS_DEFAULT,
    };
    resolvedSnapshot = empty;
    return empty;
  }
  const db = await getDB();
  const [rawProgress, rawSettings, rawAddingGame, rawSoundSettings] = await Promise.all([
    db.getAll("progress"),
    db.get("settings", "settings"),
    db.get("adding-game", "adding-game"),
    db.get("sound-settings", "sound-settings"),
  ]);
  const progress = new Map<string, Progress>();
  for (const raw of rawProgress) {
    const parsed = ProgressSchema.safeParse(raw);
    if (parsed.success) progress.set(parsed.data.id, parsed.data);
  }
  const settings = SettingsSchema.parse(rawSettings ?? SETTINGS_DEFAULT);
  const addingGame = AddingGameStateSchema.parse(rawAddingGame ?? ADDING_GAME_DEFAULT);
  const soundSettings = SoundSettingsSchema.parse(rawSoundSettings ?? SOUND_SETTINGS_DEFAULT);
  const snapshot: HydratedState = { progress, settings, addingGame, soundSettings };
  resolvedSnapshot = snapshot;
  return snapshot;
})();
