import {
  type Progress,
  ProgressSchema,
  SETTINGS_DEFAULT,
  SettingsSchema,
} from "@dean-stack/schemas";
import type { WritableAtom } from "jotai";

import { atomWithIDB } from "~/lib/atom-with-idb";

import { persistProgress, persistSettings } from "./persist";

export const settingsAtom = atomWithIDB(
  SettingsSchema,
  (snapshot) => snapshot.settings,
  persistSettings,
  SETTINGS_DEFAULT,
);

// Parameterized atoms — prefer the IDB key over a family library.
//
// `atomWithIDB` already takes an `id` (via the reader closure + IDB row), so the
// "family" is the IDB store, not a second cache layer. The Map below memoizes
// the *atom instance* per id so two components calling `getProgressAtom(id)`
// share subscription state. Bounded by the IDB row count (game progress —
// not user-generated content), so no `setShouldRemove` policy is needed.
//
// For derived slices over a collection atom, use `selectAtom(coll, c => c.get(id))`
// from `jotai/utils` — it's the right tool for that case and ships with core jotai.
type ProgressAtom = WritableAtom<Progress, [Progress | ((prev: Progress) => Progress)], void>;

const progressAtoms = new Map<string, ProgressAtom>();

export function getProgressAtom(id: string): ProgressAtom {
  let cached = progressAtoms.get(id);
  if (!cached) {
    cached = atomWithIDB(
      ProgressSchema,
      (snapshot) => snapshot.progress.get(id),
      persistProgress,
      ProgressSchema.parse({ id }),
    );
    progressAtoms.set(id, cached);
  }
  return cached;
}
