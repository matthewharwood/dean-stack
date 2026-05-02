import {
  type Progress,
  ProgressSchema,
  SETTINGS_DEFAULT,
  type Settings,
  SettingsSchema,
} from "@dean-stack/schemas";

import { getDB } from "./db";

export type HydratedState = {
  progress: ReadonlyMap<string, Progress>;
  settings: Settings;
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
    const empty: HydratedState = { progress: new Map(), settings: SETTINGS_DEFAULT };
    resolvedSnapshot = empty;
    return empty;
  }
  const db = await getDB();
  const [rawProgress, rawSettings] = await Promise.all([
    db.getAll("progress"),
    db.get("settings", "settings"),
  ]);
  const progress = new Map<string, Progress>();
  for (const raw of rawProgress) {
    const parsed = ProgressSchema.safeParse(raw);
    if (parsed.success) progress.set(parsed.data.id, parsed.data);
  }
  const settings = SettingsSchema.parse(rawSettings ?? SETTINGS_DEFAULT);
  const snapshot: HydratedState = { progress, settings };
  resolvedSnapshot = snapshot;
  return snapshot;
})();
