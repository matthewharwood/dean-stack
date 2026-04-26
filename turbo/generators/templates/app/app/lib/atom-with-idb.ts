import { atom, type WritableAtom } from "jotai";
import type * as z from "zod";

import { getHydratedSnapshot, type HydratedState } from "~/state/hydration";

type StoreReader<V> = (snapshot: HydratedState) => V | undefined;
type StoreWriter<V> = (value: V) => void;

const UNINIT: unique symbol = Symbol("atomWithIDB.uninit");

// Pillar 3 — IDB is the source of truth; this atom is its in-memory cache.
// Reads are lazy: the first get pulls from the synchronously-cached snapshot
// (populated when `idbHydrationPromise` resolves at the root <Suspense>).
// Writes parse via the Zod schema (Pillar 2) and trigger debounced write-through
// + BroadcastChannel via the supplied `write` helper.
export function atomWithIDB<S extends z.ZodType>(
  schema: S,
  read: StoreReader<z.infer<S>>,
  write: StoreWriter<z.infer<S>>,
  fallback: z.infer<S>,
): WritableAtom<z.infer<S>, [z.infer<S> | ((prev: z.infer<S>) => z.infer<S>)], void> {
  const storage = atom<z.infer<S> | typeof UNINIT>(UNINIT);

  const resolveCurrent = (raw: z.infer<S> | typeof UNINIT): z.infer<S> => {
    if (raw !== UNINIT) return raw;
    const snapshot = getHydratedSnapshot();
    return (snapshot ? read(snapshot) : undefined) ?? fallback;
  };

  return atom(
    (get) => resolveCurrent(get(storage)),
    (get, set, update) => {
      const prev = resolveCurrent(get(storage));
      const next =
        typeof update === "function" ? (update as (p: z.infer<S>) => z.infer<S>)(prev) : update;
      const parsed = schema.parse(next);
      set(storage, parsed);
      write(parsed);
    },
  );
}
