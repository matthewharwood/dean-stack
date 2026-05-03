import type { Progress, Settings } from "@dean-stack/schemas";
import { type DBSchema, type IDBPDatabase, openDB } from "idb";

export interface AppDB extends DBSchema {
  progress: { key: string; value: Progress };
  settings: { key: string; value: Settings };
}

const DB_NAME = "{{name}}";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<AppDB>> | undefined;
let closed = false;

export function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (closed) {
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
