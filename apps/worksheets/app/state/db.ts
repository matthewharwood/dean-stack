import type { Progress, Settings } from "@dean-stack/schemas";
import { type DBSchema, type IDBPDatabase, openDB } from "idb";

import type { InkModeSettings, TemplateSetRow, WorksheetAnswers } from "./ink-schemas";

export interface AppDB extends DBSchema {
  progress: { key: string; value: Progress };
  settings: { key: string; value: Settings };
  inkMode: { key: string; value: InkModeSettings };
  templates: { key: string; value: TemplateSetRow };
  answers: { key: string; value: WorksheetAnswers };
}

const DB_NAME = "worksheets";
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<AppDB>> | undefined;

export function getDB(): Promise<IDBPDatabase<AppDB>> {
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
        // iPad-mode stores. inkMode + templates are single-row "settings"
        // tables (one record at id: "settings"/"templates"); answers is
        // keyed per worksheet by `${stageId}-${variant}`.
        db.createObjectStore("inkMode", { keyPath: "id" });
        db.createObjectStore("templates", { keyPath: "id" });
        db.createObjectStore("answers", { keyPath: "id" });
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
