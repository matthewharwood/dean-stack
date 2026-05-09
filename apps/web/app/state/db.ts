import {
  ADDING_GAME_DEFAULT,
  type AddingGameState,
  type Progress,
  type Settings,
  SOUND_SETTINGS_DEFAULT,
  type SoundSettings,
} from "@dean-stack/schemas";
import { type DBSchema, type IDBPDatabase, openDB } from "idb";

export interface AppDB extends DBSchema {
  progress: { key: string; value: Progress };
  settings: { key: string; value: Settings };
  "adding-game": { key: string; value: AddingGameState };
  "sound-settings": { key: string; value: SoundSettings };
}

const DB_NAME = "dean-stack";
const DB_VERSION = 5;

let dbPromise: Promise<IDBPDatabase<AppDB>> | undefined;
let closed = false;

export function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (closed) {
    // After `closeDB()` we refuse new connections so a pending debounced
    // persist call can't reopen the DB during `clearAllStorage` and block
    // the in-flight `deleteDatabase`. The page is about to reload; reject
    // and let callers swallow it.
    return Promise.reject(new Error("idb: closed; reload pending"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Cumulative migrations — every hop must run for users on older versions.
      // Equivalent to `switch(oldVersion)` with fall-through; the `<` form is
      // biome-clean and just as canonical.
      if (oldVersion < 1) {
        db.createObjectStore("progress", { keyPath: "id" });
      }
      if (oldVersion < 2) {
        const settings = db.createObjectStore("settings", { keyPath: "id" });
        void settings.put({ id: "settings", theme: "light", reducedMotion: false });
      }
      if (oldVersion < 3) {
        const addingGame = db.createObjectStore("adding-game", { keyPath: "id" });
        void addingGame.put(ADDING_GAME_DEFAULT);
      }
      if (oldVersion < 4) {
        // No-op hop to clear a stale dev DB that was bumped past 3 in a
        // prior working-tree experiment.
      }
      if (oldVersion < 5) {
        const soundSettings = db.createObjectStore("sound-settings", { keyPath: "id" });
        void soundSettings.put(SOUND_SETTINGS_DEFAULT);
      }
    },
    blocked() {
      console.warn("idb: blocked by an older connection");
    },
    blocking() {
      void getDB().then((db) => db.close());
      dbPromise = undefined;
    },
    terminated() {
      dbPromise = undefined;
    },
  });
  return dbPromise.catch((err) => {
    dbPromise = undefined;
    throw err;
  });
}

// Close the open connection and refuse further `getDB()` calls so
// `clearAllStorage` can `deleteDatabase` without our own handle blocking
// it AND without a pending debounced persist call sneaking a fresh
// connection in mid-clear. Terminal — the page is expected to reload
// immediately after.
export async function closeDB(): Promise<void> {
  closed = true;
  if (!dbPromise) return;
  const promise = dbPromise;
  dbPromise = undefined;
  try {
    const db = await promise;
    db.close();
  } catch {
    // Open never resolved (e.g. VersionError mid-bump). Nothing to close.
  }
}
